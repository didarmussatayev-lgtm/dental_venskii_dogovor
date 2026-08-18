from __future__ import annotations

import logging
import shutil
import tempfile
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import settings
from .docgen import convert_to_pdf, generate_docx
from .drive import build_patient_filename_base, upload_documents
from .models import AgreementRequest

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

PROCEDURE_TEMPLATES: dict[str, dict[str, str | list[str]]] = {
    "Хирургия - удаление зуба": {
        "key": "surgery_tooth_extraction",
        "filenames": [
            "СОГЛАСИЕ на хирургию удаления зуба.docx",
            "СОГЛАСИЕ на хирургию удаление зуба.docx",
        ],
    },
    "Терапия - лечение под седацией (севоран)": {
        "key": "therapy_sedation",
        "filenames": [
            "Согласие на седацию.docx",
            "согласие на седацию.docx",
            "согласие на седацию.doc",
        ],
    },
    "Терапия - лечение несовершеннолетних, согласие опекуна": {
        "key": "therapy_guardian_consent",
        "filenames": [
            "Согласие опекуна.docx",
        ],
    },
    "Терапия - лечение (взрослые и дети), согласие представителя": {
        "key": "therapy_guardian_consent",
        "filenames": [
            "Согласие опекуна.docx",
        ],
    },
    "Имплантация - Договор на имплантацию": {
        "key": "implantation_contract",
        "filenames": [
            "Договор на имплантацию.docx",
            "1. ДОГОВОР на ИМПЛАНТАЦИЮ.docx",
            "1. ДОГОВОР на ИМПЛАНТАЦИЮ.doc",
        ],
    },
    "Имплантация - Согласие на имплантацию": {
        "key": "implantation_consent",
        "filenames": [
            "Согласие на имплантацию.docx",
            "1.1. СОГЛАСИЕ на имплантацию.docx",
        ],
    },
    "Имплантация - Дополнительное соглашение к договору имплантации о гарантии": {
        "key": "implantation_warranty_addendum",
        "filenames": [
            "Дополнительное соглашение к договору имплантации о гарантии.docx",
            "ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ к дговору имплантация о гарантии.docx",
        ],
    },
    "Терапия - Согласие на эндодонтическое лечение": {
        "key": "therapy_endodontic_consent",
        "filenames": [
            "Согласие на эндодонтическое лечение.docx",
            "СОГЛАСИЕ на ЭНДОдонтическое лечение.docx",
        ],
    },
    "Терапия - Согласие на лечение кариеса": {
        "key": "therapy_caries_consent",
        "filenames": [
            "Согласие на лечение кариеса.docx",
            "СОГЛАСИЕ на терапию (лечение кариеса).docx",
        ],
    },
    "Терапия - Согласие на реставрацию зубов": {
        "key": "therapy_restoration_consent",
        "filenames": [
            "Согласие на реставрацию зубов.docx",
            "СОГЛАСИЕ на РЕСТАВРАЦИЮ зубов.docx",
        ],
    },
    "Терапия - Согласие на профессиональную чистку": {
        "key": "therapy_cleaning_consent",
        "filenames": [
            "Согласие на профессиональную чистку.docx",
            "СОГЛАСИЕ на профессиональную ЧИСТКУ.docx",
        ],
    },
    "Терапия - Согласие на повторное эндодонтическое вмешательство": {
        "key": "therapy_repeat_endodontic_consent",
        "filenames": [
            "Согласие на повторное эндодонтическое вмешательство.docx",
            "СОГЛАСИЕ на повторное эндодонтическое вмешательство.docx",
        ],
    },
    "Терапия - Согласие на глубокий кариес, переходящий в пульпит": {
        "key": "therapy_deep_caries_consent",
        "filenames": [
            "Согласие на глубокий кариес, переходящий в пульпит.docx",
            "СОГЛАСИЕ на глубокий кариес переход в пульпит.docx",
        ],
    },
}

app = FastAPI(title="Electronic Consent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/v1/agreements")
async def create_agreement(body: AgreementRequest):
    """
    Accept form data, generate DOCX+PDF set, upload DOCX+PDF to Google Drive,
    and return PDF to the client as a downloadable file.
    """
    agreement_id = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
    logger.info("Processing agreement %s for %s", agreement_id, body.full_name)

    tmp_dir = Path(tempfile.mkdtemp(prefix="agreement_"))
    try:
        # 1. Pick template by selected procedure
        template_dir = Path(settings.template_path).parent
        template_config = PROCEDURE_TEMPLATES.get(body.procedure)
        if not template_config:
            raise HTTPException(status_code=400, detail="Unsupported procedure selected.")

        template_key = str(template_config["key"])
        logger.info("Files actually in template_dir: %s", [f.name for f in template_dir.iterdir()])
        resolved_template: Path | None = None
        for candidate in template_config["filenames"]:
            path = template_dir / str(candidate)
            if path.exists():
                resolved_template = path
                break

        if not resolved_template:
            logger.error("Template not found for procedure '%s' in %s", body.procedure, template_dir)
            raise HTTPException(
                status_code=500,
                detail=f"Document template not found for '{body.procedure}'. Please contact support.",
            )

        patient_file_base = build_patient_filename_base(body.iin, body.full_name)

        # 2. Generate DOCX and convert it to PDF
        output_basename = f"{patient_file_base}_{template_key}"
        try:
            docx_path = generate_docx(
                template_path=resolved_template,
                full_name=body.full_name,
                phone=body.phone,
                iin=body.iin,
                allergy=body.allergy,
                procedure=body.procedure,
                signature_base64=body.signature_base64,
                degree_of_kinship=body.degree_of_kinship,
                guardian_relationship=body.guardian_relationship,
                name_surname_of_child=body.name_surname_of_child,
                name_surname_patient=body.name_surname_patient,
                date_of_birth=body.date_of_birth,
                id_number=body.id_number,
                id_authority=body.id_authority,
                id_date_of_issue=body.id_date_of_issue,
                adress=body.adress,
                degree_of_kinship_mother_father_guardin=body.degree_of_kinship_mother_father_guardin,
                contact_name_surname_1=body.contact_name_surname_1,
                contact_phones_1=body.contact_phones_1,
                contact_name_surname_2=body.contact_name_surname_2,
                contact_phones_2=body.contact_phones_2,
                contact_name_surname_3=body.contact_name_surname_3,
                contact_phones_3=body.contact_phones_3,
                agreement_id=agreement_id,
                output_basename=output_basename,
                output_dir=tmp_dir,
            )
        except Exception as exc:
            logger.exception("DOCX generation failed for procedure '%s'", body.procedure)
            raise HTTPException(status_code=500, detail=f"Document generation failed: {exc}") from exc

        try:
            pdf_path = convert_to_pdf(docx_path, tmp_dir)
        except Exception as exc:
            logger.exception("PDF conversion failed for procedure '%s'", body.procedure)
            raise HTTPException(status_code=500, detail=f"PDF conversion failed: {exc}") from exc

        docx_paths = [docx_path]
        pdf_paths = [pdf_path]

        # 3. Upload DOCX+PDF files to Google Drive (best-effort — don't fail on Drive error)
        drive_error: str | None = None
        if settings.google_drive_folder_id:
            if settings.oauth_credentials_info:
                try:
                    upload_documents(
                        file_paths=[*docx_paths, *pdf_paths],
                        folder_id=settings.google_drive_folder_id,
                        iin=body.iin,
                        full_name=body.full_name,
                        oauth_credentials_info=settings.oauth_credentials_info,
                    )
                except Exception as exc:
                    drive_error = str(exc)
                    logger.error("Drive upload failed for %s: %s", patient_file_base, exc)
            else:
                logger.warning("Google Drive OAuth credentials not set — skipping Drive upload")
        else:
            logger.warning("GOOGLE_DRIVE_FOLDER_ID not set — skipping Drive upload")

        # 4. Return PDF to client
        headers: dict[str, str] = {}
        if drive_error:
            headers["X-Drive-Error"] = drive_error[:200]

        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename="Vienna Dental.pdf",
            headers=headers,
            background=_cleanup_background(tmp_dir),
        )

    except HTTPException:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        logger.exception("Unexpected error for agreement %s", agreement_id)
        raise HTTPException(status_code=500, detail="Internal server error") from exc


def _cleanup_background(tmp_dir: Path):
    """Return a BackgroundTask that removes the temp directory."""
    from starlette.background import BackgroundTask

    def _cleanup():
        shutil.rmtree(tmp_dir, ignore_errors=True)
        logger.debug("Cleaned up temp dir: %s", tmp_dir)

    return BackgroundTask(_cleanup)
