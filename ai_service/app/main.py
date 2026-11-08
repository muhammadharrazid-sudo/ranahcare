"""FastAPI entry point for the RANAHCARE multi-agent prototype."""

import asyncio
import hmac
import logging
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from app.config import cors_origins, setting
from app.database import (
    SERVICE_LABELS,
    create_reservation,
    get_chat_context,
    initialize_database,
    list_reservations,
    list_schedules,
    save_chat_context,
)
from app.workflow import workflow

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RANAHCARE AI Service",
    description=(
        "Prototype receptionist, conservative triage, schedules, and reservations. "
        "Not a medical device or diagnostic service."
    ),
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


class ChatRequest(BaseModel):
    """One user message and the opaque id for its persisted workflow state."""

    conversation_id: UUID
    message: str = Field(min_length=1, max_length=2000)
    allow_ai: bool = False


class ReservationRequest(BaseModel):
    """Patient-provided details required to confirm a prototype booking."""

    schedule_id: int = Field(gt=0)
    service: str = Field(pattern=r"^(umum|spesialis|tele|lab|vaksin)$")
    starts_at: datetime
    patient_name: str = Field(min_length=3, max_length=120)
    phone: str = Field(min_length=8, max_length=20)
    coverage: str = Field(default="Umum", pattern=r"^(Umum|BPJS Kesehatan|Asuransi swasta)$")
    complaint: str = Field(default="", max_length=1000)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        """Accept phone digits and common international formatting only."""
        normalized = "".join(character for character in value if character.isdigit() or character == "+")
        if not normalized.startswith(("+62", "62", "0")) or len(normalized) < 10:
            raise ValueError("Masukkan nomor telepon Indonesia yang valid.")
        return normalized


class WearableDay(BaseModel):
    """Daily descriptive wearable measurements; no disease labels are accepted."""

    date: datetime
    steps: int = Field(ge=0, le=100000)
    sleep_hours: float = Field(ge=0, le=24)
    resting_heart_rate: int = Field(ge=25, le=240)
    glucose_mg_dl: float | None = Field(default=None, ge=20, le=700)


class WearableRequest(BaseModel):
    """Consent-gated series used for a non-diagnostic trend description."""

    consent: bool
    days: list[WearableDay] = Field(min_length=14, max_length=90)


@app.on_event("startup")
def startup() -> None:
    """Prepare local demo tables and appointment slots when the API starts."""
    initialize_database()


@app.get("/api/health")
def health() -> dict[str, str]:
    """Confirm API availability without exposing provider keys or patient data."""
    return {"status": "ok", "service": "ranahcare-ai"}


@app.post("/api/chat")
async def chat(request: ChatRequest) -> dict[str, Any]:
    """Run one graph turn and persist only the conversation's minimal context."""
    conversation_id = str(request.conversation_id)
    context = get_chat_context(conversation_id)
    state = {
        "message": request.message.strip(),
        "context": context,
        "allow_ai": request.allow_ai,
    }
    try:
        result = await asyncio.to_thread(workflow.invoke, state)
    except RuntimeError as error:
        logger.exception("Workflow AI gagal.")
        raise HTTPException(status_code=502, detail=str(error)) from error
    except Exception as error:
        logger.exception("Workflow chat gagal.")
        raise HTTPException(status_code=500, detail="Workflow gagal memproses pesan.") from error
    next_context = result.get("context", context)
    save_chat_context(conversation_id, next_context)
    return {
        "reply": result["reply"],
        "intent": result.get("intent", "receptionist"),
        "action": result.get("action", ""),
        "triage": result.get("triage"),
        "context": {
            "mode": next_context.get("mode", ""),
            "symptoms": next_context.get("symptoms", []),
            "duration": next_context.get("duration", ""),
            "severity": next_context.get("severity", ""),
        },
        "notice": (
            "Triase hanya arahan awal; tenaga medis wajib memvalidasi. "
            "Jangan masukkan NIK atau data identitas."
        ),
    }


@app.get("/api/schedules")
def schedules(
    service: str = Query(default="", pattern=r"^(|umum|spesialis|tele|lab|vaksin)$"),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict[str, Any]:
    """Read open appointment slots from SQLite rather than model memory."""
    return {
        "items": list_schedules(service=service, limit=limit),
        "service_label": SERVICE_LABELS.get(service, "Semua layanan"),
    }


@app.post("/api/reservations", status_code=201)
def reserve(request: ReservationRequest) -> dict[str, Any]:
    """Create a booking after explicit patient confirmation and slot validation."""
    payload = request.model_dump()
    payload["starts_at"] = request.starts_at.isoformat(timespec="minutes")
    try:
        booking = create_reservation(payload)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return {"reservation": booking}


@app.post("/api/wearables/trends")
def wearable_trends(request: WearableRequest) -> dict[str, Any]:
    """Describe 14+ days of self-reported metrics without predicting disease."""
    if not request.consent:
        raise HTTPException(status_code=400, detail="Persetujuan pemrosesan data diperlukan.")
    ordered = sorted(request.days, key=lambda item: item.date)
    first, last = ordered[0], ordered[-1]
    if (last.date - first.date).days < 13:
        raise HTTPException(status_code=422, detail="Data perlu mencakup sekurangnya 14 hari.")
    trends = {
        "steps": round(last.steps - first.steps, 1),
        "sleep_hours": round(last.sleep_hours - first.sleep_hours, 1),
        "resting_heart_rate": last.resting_heart_rate - first.resting_heart_rate,
    }
    glucose_values = [day.glucose_mg_dl for day in ordered if day.glucose_mg_dl is not None]
    if glucose_values:
        trends["glucose_mg_dl"] = round(glucose_values[-1] - glucose_values[0], 1)
    return {
        "period_days": (last.date - first.date).days + 1,
        "trend_from_first_to_last": trends,
        "observation": (
            "Ini hanya ringkasan perubahan pengukuran, bukan prediksi penyakit atau "
            "penilaian klinis. Perangkat murah dapat tidak akurat; bawa catatan ini "
            "kepada tenaga medis untuk interpretasi."
        ),
        "human_review_required": True,
    }


def require_admin_token(authorization: str | None = Header(default=None)) -> None:
    """Protect patient reservation data; fail closed if no admin token is configured."""
    expected = setting("ADMIN_API_TOKEN")
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="ADMIN_API_TOKEN belum dikonfigurasi; endpoint admin dinonaktifkan.",
        )
    supplied = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Token admin tidak valid.")


@app.get("/api/admin/reservations", dependencies=[Depends(require_admin_token)])
def admin_reservations(limit: int = Query(default=100, ge=1, le=500)) -> dict[str, Any]:
    """Return a bounded patient list only to a caller with the configured token."""
    return {"items": list_reservations(limit=limit)}
