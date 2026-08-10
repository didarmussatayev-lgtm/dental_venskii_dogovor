from __future__ import annotations

import logging
import re
import unicodedata
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_DRIVE_AVAILABLE = False
try:
    from google.oauth2 import service_account
    from google.oauth2.credentials import Credentials as OAuthCredentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    _DRIVE_AVAILABLE = True
except ImportError:
    logger.warning("google-api-python-client not installed; Drive upload disabled")

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
TOKEN_URI = "https://oauth2.googleapis.com/token"


def _build_service(
    service_account_info: Optional[dict],
    service_account_file: Optional[str],
    oauth_credentials_info: Optional[dict] = None,
):
    """
    Build and return a Google Drive service object.

    Priority:
      1. OAuth user-delegated credentials (works with personal Gmail Drive quota)
      2. Service-account credentials (only works with Shared Drives / Workspace)
    """
    if not _DRIVE_AVAILABLE:
        raise RuntimeError("Google API client library is not installed")

    if oauth_credentials_info:
        creds = OAuthCredentials(
            token=None,
            refresh_token=oauth_credentials_info["refresh_token"],
            client_id=oauth_credentials_info["client_id"],
            client_secret=oauth_credentials_info["client_secret"],
            token_uri=TOKEN_URI,
            scopes=SCOPES,
        )
    elif service_account_info:
        creds = service_account.Credentials.from_service_account_info(
            service_account_info, scopes=SCOPES
        )
    elif service_account_file and Path(service_account_file).exists():
        creds = service_account.Credentials.from_service_account_file(
            service_account_file, scopes=SCOPES
        )
    else:
        raise RuntimeError(
            "No Google Drive credentials found. Set GOOGLE_OAUTH_CLIENT_ID / "
            "GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN, or "
            "GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_SERVICE_ACCOUNT_FILE."
        )
    return build("drive", "v3", credentials=creds)


def _safe_filename(value: str) -> str:
    """Normalize a string for safe and readable filenames."""
    normalized = unicodedata.normalize("NFKC", value).strip()
    normalized = re.sub(r"[\x00-\x1f\x7f]+", "", normalized)
    normalized = re.sub(r'[\\/:*?"<>|]+', " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    normalized = re.sub(r"[^\w .()\-]", "", normalized, flags=re.UNICODE)
    normalized = normalized.replace(" ", "_")
    return (normalized or "patient")[:80]


def build_patient_filename_base(iin: str, full_name: str) -> str:
    safe_iin = _safe_filename(iin)
    safe_name = _safe_filename(full_name)
    return f"{safe_iin}_{safe_name}"


def upload_documents(
    file_paths: list[Path],
    folder_id: str,
    iin: str,
    full_name: str,
    service_account_info: Optional[dict] = None,
    service_account_file: Optional[str] = None,
    oauth_credentials_info: Optional[dict] = None,
) -> dict:
    """
    Upload generated documents to Google Drive.
    Returns a dict with uploaded file IDs by filename.
    Raises RuntimeError on failure.
    """
    service = _build_service(service_account_info, service_account_file, oauth_credentials_info)
    patient_base = build_patient_filename_base(iin, full_name)
    uploaded_ids: dict[str, str] = {}
    for file_path in file_paths:
        suffix = _safe_filename(file_path.stem.split("_")[-1]) or "document"
        extension = file_path.suffix.lower()
        file_name = f"{patient_base}_{suffix}{extension}"
        metadata = {
            "name": file_name,
            "parents": [folder_id] if folder_id else [],
        }
        media = MediaFileUpload(str(file_path), resumable=False)
        uploaded = (
            service.files()
            .create(body=metadata, media_body=media, fields="id,name")
            .execute()
        )
        logger.info("Uploaded file to Drive as %s (id=%s)", file_name, uploaded.get("id"))
        uploaded_ids[file_name] = uploaded.get("id")
    return uploaded_ids
