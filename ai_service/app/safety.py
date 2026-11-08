"""Conservative, non-diagnostic triage helpers with local-only processing."""

import re
from typing import Any

from langchain_core.tools import tool

SYMPTOM_TERMS = {
    "demam": ("demam", "panas badan"),
    "batuk": ("batuk",),
    "pilek": ("pilek", "ingusan"),
    "sesak_napas": ("sesak napas", "sulit bernapas", "susah bernapas"),
    "nyeri_dada": ("nyeri dada", "dada terasa sakit", "sakit dada"),
    "pusing": ("pusing", "sakit kepala"),
    "mual": ("mual",),
    "muntah": ("muntah",),
    "diare": ("diare", "mencret"),
    "nyeri_perut": ("nyeri perut", "sakit perut"),
    "ruam": ("ruam", "gatal-gatal"),
    "lemas": ("lemas", "lunglai"),
}
EMERGENCY_TERMS = (
    "nyeri dada berat",
    "sakit dada berat",
    "nyeri dada",
    "sakit dada",
    "sesak napas berat",
    "sulit bernapas berat",
    "tidak bisa bernapas",
    "pingsan",
    "tidak sadar",
    "kejang",
    "muntah darah",
    "perdarahan hebat",
    "bibir membiru",
)


def _is_negated(text: str, phrase: str) -> bool:
    """Avoid interpreting a short, explicit negation as a reported symptom."""
    for match in re.finditer(re.escape(phrase), text):
        prefix = text[max(0, match.start() - 40) : match.start()]
        if re.search(r"\b(?:tidak|bukan|tanpa|nggak|enggak)(?:\s+\w+){0,2}\s*$", prefix):
            return True
    return False


def extract_symptoms(text: str) -> list[str]:
    """Match a small symptom vocabulary; unmatched language is never guessed."""
    normalized = text.casefold()
    return [
        key
        for key, phrases in SYMPTOM_TERMS.items()
        if any(phrase in normalized and not _is_negated(normalized, phrase) for phrase in phrases)
    ]


def find_emergency_sign(text: str) -> str | None:
    """Find explicit emergency phrases before any routine workflow response."""
    normalized = re.sub(r"\s+", " ", text.casefold())
    return next(
        (
            term
            for term in EMERGENCY_TERMS
            if term in normalized and not _is_negated(normalized, term)
        ),
        None,
    )


def extract_duration(text: str) -> str:
    """Recognize common duration answers without inferring an exact diagnosis."""
    normalized = text.casefold()
    if re.search(r"\b(jam|menit)\b", normalized) or "baru saja" in normalized:
        return "kurang dari 1 hari"
    if re.search(r"\b(1|satu|2|dua|3|tiga)\s*(hari|hr)\b", normalized):
        return "1–3 hari"
    if re.search(r"\b(4|5|6|7|lebih dari 3)\s*(hari|hr)\b", normalized):
        return "lebih dari 3 hari"
    if "minggu" in normalized:
        return "lebih dari 3 hari"
    return ""


def extract_severity(text: str) -> str:
    """Recognize only explicit patient-reported severity words."""
    normalized = text.casefold()
    if any(word in normalized for word in ("berat", "parah", "sulit beraktivitas")):
        return "berat"
    if any(word in normalized for word in ("sedang", "terganggu")):
        return "sedang"
    if any(word in normalized for word in ("ringan", "tidak mengganggu")):
        return "ringan"
    return ""


@tool
def assess_symptoms(symptoms: list[str], duration: str, severity: str) -> dict[str, Any]:
    """Produce a conservative navigation suggestion, never a medical diagnosis."""
    if "sesak_napas" in symptoms or severity == "berat":
        urgency = "segera"
        next_step = "Hubungi petugas kesehatan hari ini untuk penilaian langsung."
    else:
        urgency = "rutin"
        next_step = "Buat janji dengan dokter umum untuk penilaian tenaga medis."
    return {
        "category": "keluhan yang perlu dinilai tenaga medis",
        "symptoms": symptoms,
        "duration": duration,
        "patient_reported_severity": severity,
        "suggested_service": "umum",
        "urgency": urgency,
        "human_review_required": True,
        "disclaimer": "Bukan diagnosis dan tidak menggantikan pemeriksaan tenaga medis.",
        "next_step": next_step,
    }
