"""Configuration – environment variables only, so the container stays stateless."""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def _bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Config:
    navidrome_db: Path
    navidrome_url: str
    data_dir: Path
    timezone: ZoneInfo
    port: int
    secret_key: str
    verify_tls: bool

    @property
    def store_path(self) -> Path:
        return self.data_dir / "rotation.db"


def _timezone() -> ZoneInfo:
    """Rotation buckets plays into local days and hours, so it needs a zone.

    `TZ` is what container images already set, so it is the first choice;
    `ROTATION_TZ` exists for the rare case where the two should differ.
    """
    name = os.environ.get("ROTATION_TZ") or os.environ.get("TZ") or "UTC"
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")


def _secret_key(data_dir: Path) -> str:
    """A stable key, so sessions survive a restart without being configured."""
    configured = os.environ.get("ROTATION_SECRET_KEY")
    if configured:
        return configured
    path = data_dir / "secret.key"
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    key = secrets.token_hex(32)
    data_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(key, encoding="utf-8")
    path.chmod(0o600)
    return key


def load() -> Config:
    data_dir = Path(os.environ.get("ROTATION_DATA", "/data"))
    return Config(
        navidrome_db=Path(os.environ.get("NAVIDROME_DB", "/navidrome/navidrome.db")),
        navidrome_url=os.environ.get("NAVIDROME_URL", "http://navidrome:4533").rstrip("/"),
        data_dir=data_dir,
        timezone=_timezone(),
        port=int(os.environ.get("ROTATION_PORT", "8770")),
        secret_key=_secret_key(data_dir),
        verify_tls=_bool("ROTATION_VERIFY_TLS", True),
    )
