from __future__ import annotations

from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict



class Settings(BaseSettings):
    test_mode: bool = True
    test_phone_number: str = ""
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
    
    # ClinicCards CRM
    cliniccards_token: str = ""
    cliniccards_base_url: str = "https://cliniccards.com/api"

    # Evolution API (WhatsApp)
    evolution_api_url: str = ""       # например https://your-evolution.up.railway.app
    evolution_api_key: str = ""
    evolution_instance: str = ""

    clinic_timezone: str = "Asia/Almaty"  # Астана = UTC+5, тот же пояс

settings = Settings()
