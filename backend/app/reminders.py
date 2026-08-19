from __future__ import annotations

import logging
import re
from datetime import date, timedelta
from typing import Any

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from .config import settings

logger = logging.getLogger(__name__)

CLINIC_ADDRESS = "г.Астана, ул.А.Бокейхана 29 Б"
CLINIC_2GIS_LINK = "https://2gis.kz/astana/geo/70000001050084675"
CLINIC_INSTAGRAM = "https://instagram.com/vienna_dental?utm_medium=copy_link"
CLINIC_SITE = "https://go.2gis.com/sfdj62"

# In-memory store: normalized phone -> pending visit info awaiting patient's reply.
# NOTE: this is cleared on every process restart. Since reminders are sent in the
# morning and replies are expected the same day, this is usually fine, but if
# Railway restarts the container mid-day, pending confirmations are lost.
# For stronger durability, swap this dict for Redis or a small DB table.
_pending_confirmations: dict[str, dict[str, Any]] = {}


def _normalize_phone(raw: str) -> str:
    """'77771234567@s.whatsapp.net' or '+7 777 123 45 67' -> '77771234567'."""
    digits_only = re.sub(r"\D", "", raw.split("@")[0])
    return digits_only


async def _cliniccards_get(path: str, params: dict | None = None) -> dict:
    url = f"{settings.cliniccards_base_url}{path}"
    headers = {"Token": settings.cliniccards_token}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


async def _cliniccards_put_visit(payload: dict) -> dict:
    url = f"{settings.cliniccards_base_url}/visits"
    headers = {"Token": settings.cliniccards_token, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.put(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()


async def _send_whatsapp(number: str, text: str) -> None:
    url = f"{settings.evolution_api_url}/message/sendText/{settings.evolution_instance}"
    headers = {"Content-Type": "application/json", "apikey": settings.evolution_api_key}
    body = {"number": number, "text": text}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, json=body)
        if resp.status_code >= 400:
            logger.error("Evolution API send failed for %s: %s %s", number, resp.status_code, resp.text)
        resp.raise_for_status()


def _build_reminder_text(visit_date: str, time_start: str) -> str:
    return (
        "Добрый вечер, у вас запланирована запись на завтра:\n"
        f"🗓️ дата: {visit_date}\n"
        f"⏰ время: {time_start} ч\n"
        f"📍 Наш адрес: {CLINIC_ADDRESS}\n"
        f"{CLINIC_2GIS_LINK}\n"
        f"Инстаграм: {CLINIC_INSTAGRAM}\n"
        f"Сайт: {CLINIC_SITE}\n"
        "Подтвердите свою запись пожалуйста, отправить соответствующую цифру\n"
        "1 - подтверждаю\n"
        "2 - хочу перенести\n"
        "3 - хочу отказаться"
    )


async def send_daily_reminders() -> None:
    """Fetch tomorrow's visits, send WhatsApp reminders, and remember them for later confirmation."""
    tomorrow = date.today() + timedelta(days=1)
    date_str = tomorrow.strftime("%Y-%m-%d")
    logger.info("Reminders job: fetching visits for %s", date_str)

    try:
        visits_resp = await _cliniccards_get("/visits", params={"from": date_str, "to": date_str})
    except Exception:
        logger.exception("Failed to fetch visits for %s", date_str)
        return

    visits = visits_resp.get("data", [])
    logger.info("Found %d visits for %s", len(visits), date_str)

    for visit in visits:
        try:
            await _process_single_visit(visit, tomorrow, date_str)
        except Exception:
            logger.exception("Failed to process visit %s", visit.get("visit_id") or visit.get("id"))


async def _process_single_visit(visit: dict, tomorrow: date, date_str: str) -> None:
    patient_id = visit.get("patient_id")
    visit_id = visit.get("visit_id") or visit.get("id")
    cabinet_id = visit.get("cabinet_id")
    doctor_id = visit.get("doctor_id")
    time_start = visit.get("visit_start") or visit.get("time_start")
    time_end = visit.get("visit_end") or visit.get("time_end")

    if not patient_id:
        logger.warning("Visit %s has no patient_id, skipping", visit_id)
        return

    patient_resp = await _cliniccards_get(f"/patients/{patient_id}")
    patient = patient_resp.get("data", patient_resp)
    phone = patient.get("phone") or patient.get("mobile")
    if not phone:
        logger.warning("Patient %s has no phone, skipping visit %s", patient_id, visit_id)
        return

    normalized_phone = _normalize_phone(phone)
    display_date = tomorrow.strftime("%d.%m.%Y")
    text = _build_reminder_text(display_date, time_start or "")

    await _send_whatsapp(normalized_phone, text)

    _pending_confirmations[normalized_phone] = {
        "visit_id": visit_id,
        "patient_id": patient_id,
        "cabinet_id": cabinet_id,
        "doctor_id": doctor_id,
        "date": date_str,
        "time_start": time_start,
        "time_end": time_end,
    }
    logger.info("Reminder sent to %s for visit %s", normalized_phone, visit_id)


def start_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone=settings.clinic_timezone)
    scheduler.add_job(send_daily_reminders, CronTrigger(hour=9, minute=0))
    scheduler.start()
    logger.info("Reminder scheduler started — daily at 09:00 %s", settings.clinic_timezone)
    return scheduler


async def _update_visit_status(pending: dict, status: str) -> None:
    payload = {
        "visit_id": pending["visit_id"],
        "note": "visit note",
        "status": status,
        "patient_id": pending["patient_id"],
        "cabinet_id": pending["cabinet_id"],
        "doctor_id": pending["doctor_id"],
        "date": pending["date"],
        "time_start": pending["time_start"],
        "time_end": pending["time_end"],
    }
    try:
        await _cliniccards_put_visit(payload)
        logger.info("Visit %s status updated to %s", pending["visit_id"], status)
    except Exception:
        logger.exception("Failed to update visit %s to status %s", pending["visit_id"], status)


async def handle_incoming_whatsapp(payload: dict) -> None:
    """Process an incoming Evolution API webhook payload (messages.upsert event)."""
    event = str(payload.get("event", "")).lower()
    if event != "messages.upsert":
        return

    data = payload.get("data", {})
    key = data.get("key", {})
    if key.get("fromMe"):
        return  # ignore our own outgoing messages

    remote_jid = key.get("remoteJid", "")
    message = data.get("message", {})
    text = (
        message.get("conversation")
        or (message.get("extendedTextMessage") or {}).get("text")
        or ""
    ).strip()

    if not remote_jid or not text:
        return

    phone = _normalize_phone(remote_jid)
    pending = _pending_confirmations.get(phone)
    if not pending:
        logger.info("Received '%s' from %s but no pending confirmation found", text, phone)
        return

    digit = text[0]

    if digit == "1":
        await _update_visit_status(pending, "CONFIRMED")
        await _send_whatsapp(phone, "Спасибо! Ваша запись подтверждена. Ждём вас ✅")
        _pending_confirmations.pop(phone, None)
    elif digit == "2":
        await _update_visit_status(pending, "NOT_CONFIRMED")
        await _send_whatsapp(phone, "Хорошо, свяжитесь с нами по телефону клиники, чтобы перенести запись.")
        _pending_confirmations.pop(phone, None)
    elif digit == "3":
        await _update_visit_status(pending, "CANCELLED")
        await _send_whatsapp(phone, "Ваша запись отменена. Будем рады видеть вас в другой раз!")
        _pending_confirmations.pop(phone, None)
    else:
        await _send_whatsapp(phone, "Пожалуйста, отправьте цифру 1, 2 или 3.")
