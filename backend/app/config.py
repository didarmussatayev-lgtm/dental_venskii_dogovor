from __future__ import annotations

import json
import logging
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # General
    app_env: str = "development"
    log_level: str = "INFO"

    # CORS — comma-separated list of origins, e.g. "https://user.github.io,http://localhost:5500"
    cors_origins: str = "*"

    # Google Drive
    google_drive_folder_id: str = ""

    # --- Service-account auth (kept for backward compatibility / Shared Drives) ---
    google_service_account_json: str = ""
    google_service_account_file: str = "service_account.json"

    # --- OAuth user-delegated auth (required for personal Gmail Drive quota) ---
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_refresh_token: str = ""

    # Template
    template_path: str = "app/templates/soglasie_template_general.docx"

    @property
    def cors_origins_list(self) -> List[str]:
        """Return CORS origins as a list."""
        if self.cors_origins == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def service_account_info(self) -> dict | None:
        """Parse and return service-account credentials dict, or None."""
        raw = self.google_service_account_json.strip()
        if raw:
            try:
                return json.loads(raw)
            except json.JSONDecodeError as exc:
                logger.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: %s", exc)
        return None

    @property
    def oauth_credentials_info(self) -> dict | None:
        """Return OAuth client info dict if all three OAuth vars are set, else None."""
        if (
            self.google_oauth_client_id.strip()
            and self.google_oauth_client_secret.strip()
            and self.google_oauth_refresh_token.strip()
        ):
            return {
                "client_id": self.google_oauth_client_id.strip(),
                "client_secret": self.google_oauth_client_secret.strip(),
                "refresh_token": self.google_oauth_refresh_token.strip(),
            }
        return None


settings = Settings()
