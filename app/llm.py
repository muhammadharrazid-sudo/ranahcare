"""Explicit-consent, provider-fallback text generation for admin questions."""

import logging
import re
from collections.abc import Sequence

from app.config import setting

logger = logging.getLogger(__name__)


def _redact_identifiers(text: str) -> str:
    """Remove common phone, email, and 16-digit identity number patterns."""
    redacted = re.sub(r"\b\d{16}\b", "[nomor identitas dihapus]", text)
    redacted = re.sub(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b", "[email dihapus]", redacted)
    redacted = re.sub(r"(?:\+?62|0)\d[\d\s-]{7,14}", "[nomor telepon dihapus]", redacted)
    return redacted[:1000]


def generate_receptionist_reply(message: str) -> str:
    """Try configured small models in order and expose provider failures."""
    providers: Sequence[str] = tuple(
        item.strip().lower()
        for item in setting("AI_PROVIDER_ORDER", "groq,google").split(",")
        if item.strip()
    )
    safe_message = _redact_identifiers(message)
    failures: list[str] = []
    for provider in providers:
        api_key = setting("GROQ_API_KEY" if provider == "groq" else "GOOGLE_API_KEY")
        if not api_key or provider not in {"groq", "google"}:
            continue
        try:
            if provider == "groq":
                from langchain_groq import ChatGroq

                model = ChatGroq(
                    model=setting("GROQ_MODEL", "llama-3.1-8b-instant"),
                    api_key=api_key,
                    temperature=0.2,
                )
            else:
                from langchain_google_genai import ChatGoogleGenerativeAI

                model = ChatGoogleGenerativeAI(
                    model=setting("GOOGLE_MODEL", "gemini-2.5-flash-lite"),
                    google_api_key=api_key,
                    temperature=0.2,
                )
            response = model.invoke(
                [
                    (
                        "system",
                        "Anda resepsionis RANAHCARE. Jawab singkat dalam Bahasa Minang "
                        "sederhana bila mampu, selain itu Bahasa Indonesia. Batasi diri "
                        "pada informasi administrasi puskesmas. Jangan memberi diagnosis, "
                        "saran obat, atau mengarang jadwal. Bila perlu, arahkan ke petugas.",
                    ),
                    ("human", safe_message),
                ]
            )
            content = response.content
            if isinstance(content, str) and content.strip():
                return content.strip()[:2000]
            raise RuntimeError(f"Provider {provider} returned an empty response.")
        except Exception as error:
            logger.exception("Provider AI %s gagal; mencoba provider berikutnya.", provider)
            failures.append(f"{provider}: {type(error).__name__}")
    if failures:
        raise RuntimeError("Semua provider AI gagal: " + "; ".join(failures))
    return ""
