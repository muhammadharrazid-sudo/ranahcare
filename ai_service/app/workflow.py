"""Single-entry LangGraph workflow for receptionist, triage, and booking modes."""

from typing import Any, Literal, TypedDict

from langchain_core.tools import tool
from langgraph.graph import END, StateGraph

from app.database import SERVICE_LABELS, list_schedules
from app.llm import generate_receptionist_reply
from app.safety import (
    assess_symptoms,
    extract_duration,
    extract_severity,
    extract_symptoms,
    find_emergency_sign,
)


class ChatState(TypedDict, total=False):
    """State carried between the router and the selected workflow module."""

    message: str
    context: dict[str, Any]
    allow_ai: bool
    intent: str
    reply: str
    action: str
    triage: dict[str, Any]


@tool
def lookup_schedule(service: str = "") -> list[dict[str, Any]]:
    """Look up available appointments from the local schedule database."""
    return list_schedules(service=service, limit=8)


@tool
def prepare_reservation() -> dict[str, str]:
    """Direct a patient to the explicit booking-and-confirmation form."""
    return {
        "action": "reservasi",
        "message": "Pilih jadwal dan periksa kembali data sebelum mengonfirmasi reservasi.",
    }


def _service_for_message(message: str) -> str:
    """Map clear service requests to a seeded schedule category."""
    normalized = message.casefold()
    if "lab" in normalized or "laboratorium" in normalized:
        return "lab"
    if "vaksin" in normalized or "imunisasi" in normalized:
        return "vaksin"
    if "telekonsultasi" in normalized or "konsultasi online" in normalized:
        return "tele"
    if any(word in normalized for word in ("anak", "bayi", "balita")):
        return "spesialis"
    if any(word in normalized for word in ("spesialis", "penyakit dalam")):
        return "spesialis"
    return "umum"


def _router(state: ChatState) -> ChatState:
    """Select a module from the user's message and persisted session mode."""
    text = state["message"].casefold()
    context = state.get("context", {})
    if any(word in text for word in ("jadwal", "dokter", "poli", "jam buka")):
        intent = "schedule"
    elif any(word in text for word in ("reservasi", "booking", "antrean")):
        intent = "reservation"
    elif context.get("mode") == "triage":
        intent = "triage"
    elif any(
        word in text
        for word in (
            "gejala",
            "keluhan",
            "sakit",
            "batuk",
            "demam",
            "pusing",
            "mual",
            "sesak",
            "dada",
            "mencret",
            "sakik",
            "sakiknyo",
        )
    ):
        intent = "triage"
    else:
        intent = "receptionist"
    return {**state, "intent": intent}


def _triage(state: ChatState) -> ChatState:
    """Gather patient-reported symptoms locally and keep human review mandatory."""
    message = state["message"].strip()
    context = dict(state.get("context", {}))
    if context.get("mode") != "triage":
        context = {}
    prior_text = str(context.get("reported_text", ""))
    reported_text = (prior_text + " " + message).strip()[-2000:]
    emergency = find_emergency_sign(reported_text)
    if emergency:
        result = {
            "category": "tanda bahaya yang perlu penilaian segera",
            "symptoms": extract_symptoms(reported_text),
            "suggested_service": "IGD",
            "urgency": "darurat",
            "human_review_required": True,
            "disclaimer": "Chatbot tidak dapat menilai keadaan darurat.",
        }
        return {
            **state,
            "context": {"mode": "completed", "reported_text": reported_text},
            "triage": result,
            "reply": (
                "Teks Anda menyebut tanda bahaya (" + emergency + "). "
                "Jangan menunggu balasan chatbot: segera hubungi layanan darurat "
                "setempat atau datangi IGD terdekat. Minta bantuan orang di sekitar."
            ),
            "action": "darurat",
        }

    symptoms = sorted(set(context.get("symptoms", []) + extract_symptoms(message)))
    duration = extract_duration(message) or str(context.get("duration", ""))
    severity = extract_severity(message) or str(context.get("severity", ""))
    next_context = {
        "mode": "triage",
        "reported_text": reported_text,
        "symptoms": symptoms,
        "duration": duration,
        "severity": severity,
    }
    if not symptoms:
        return {
            **state,
            "context": next_context,
            "reply": (
                "Keluhan apo nan diraso? Sejak kapan, dan apakah manggangu aktivitas? "
                "Boleh jawab Minang atau Indonesia. Saya hanya membantu mengarahkan, "
                "bukan mendiagnosis."
            ),
            "action": "",
        }
    if not duration:
        return {
            **state,
            "context": next_context,
            "reply": "Keluhan tu lah diraso sajak bilo? (misalnya beberapa jam, 1–3 hari, atau lebih lama)",
            "action": "",
        }
    if not severity:
        return {
            **state,
            "context": next_context,
            "reply": "Sakiknyo ringan, sedang, atau berat sampai aktivitas terganggu?",
            "action": "",
        }

    result = assess_symptoms.invoke(
        {"symptoms": symptoms, "duration": duration, "severity": severity}
    )
    next_context["mode"] = "completed"
    next_context["last_triage"] = result
    summary = ", ".join(symptoms)
    return {
        **state,
        "context": next_context,
        "triage": result,
        "reply": (
            f"Catatan awal: {summary}; durasi {duration}; tingkat yang Anda laporkan "
            f"{severity}. Ini bukan diagnosis. {result['next_step']} "
            "Tenaga medis perlu menilai dan memvalidasi keluhan Anda."
        ),
        "action": "reservasi" if result["urgency"] != "darurat" else "darurat",
    }


def _schedule(state: ChatState) -> ChatState:
    """Answer schedule questions exclusively from the schedule lookup tool."""
    service = _service_for_message(state["message"])
    slots = lookup_schedule.invoke({"service": service})
    if not slots:
        return {
            **state,
            "reply": "Belum ada jadwal tersedia untuk layanan itu. Silakan hubungi petugas puskesmas.",
            "action": "",
        }
    details = [
        f"{slot['doctor_name']} ({slot['specialty']}), "
        f"{slot['starts_at'].replace('T', ' pukul ')}"
        for slot in slots[:5]
    ]
    return {
        **state,
        "reply": (
            f"Jadwal yang tersedia untuk {SERVICE_LABELS.get(service, service)} "
            "berdasarkan data demo: " + "; ".join(details) + ". "
            "Silakan konfirmasi ketersediaan sebelum datang."
        ),
        "action": "reservasi",
    }


def _reservation(state: ChatState) -> ChatState:
    """Route booking intent to the confirmation form; never book without consent."""
    prepared = prepare_reservation.invoke({})
    return {
        **state,
        "reply": prepared["message"],
        "action": prepared["action"],
    }


def _receptionist(state: ChatState) -> ChatState:
    """Respond to general requests without letting the model triage symptoms."""
    message = state["message"].strip()
    if not state.get("allow_ai"):
        greeting = (
            "Assalamualaikum, ado nan bisa wak bantu? "
            "Saya bisa membantu info layanan, jadwal, triase awal, atau reservasi."
        )
        return {**state, "reply": greeting, "action": ""}
    response = generate_receptionist_reply(message)
    if not response:
        return {
            **state,
            "reply": (
                "Assalamualaikum, ado nan bisa wak bantu? Untuk jadwal yang akurat, "
                "tanyakan nama dokter atau poli; untuk keluhan, ceritakan gejala Anda."
            ),
            "action": "",
        }
    return {**state, "reply": response, "action": ""}


def _route(state: ChatState) -> Literal["triage", "schedule", "reservation", "receptionist"]:
    """Select a single workflow branch after intent classification."""
    intent = state.get("intent", "receptionist")
    if intent in {"triage", "schedule", "reservation"}:
        return intent
    return "receptionist"


def build_workflow():
    """Compile the LangGraph router and the three behind-the-scenes modules."""
    graph = StateGraph(ChatState)
    graph.add_node("router", _router)
    graph.add_node("triage", _triage)
    graph.add_node("schedule", _schedule)
    graph.add_node("reservation", _reservation)
    graph.add_node("receptionist", _receptionist)
    graph.set_entry_point("router")
    graph.add_conditional_edges(
        "router",
        _route,
        {
            "triage": "triage",
            "schedule": "schedule",
            "reservation": "reservation",
            "receptionist": "receptionist",
        },
    )
    for node in ("triage", "schedule", "reservation", "receptionist"):
        graph.add_edge(node, END)
    return graph.compile()


workflow = build_workflow()
