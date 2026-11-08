"""Environment-backed settings for the local RANAHCARE prototype."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def setting(name: str, default: str = "") -> str:
    """Read one setting without ever embedding credentials in source code."""
    return os.getenv(name, default).strip()


def database_path() -> Path:
    """Resolve the SQLite file path relative to the service directory."""
    raw_path = setting("DATABASE_PATH", "./ranahcare.db")
    path = Path(raw_path)
    return path if path.is_absolute() else BASE_DIR / path


def cors_origins() -> list[str]:
    """Return the explicitly configured browser origins."""
    raw_origins = setting(
        "CORS_ORIGINS",
        "http://127.0.0.1:5500,http://localhost:5500,http://localhost",
    )
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
