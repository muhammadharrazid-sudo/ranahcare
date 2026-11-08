"""SQLite persistence for demo schedules, chat state, and reservations."""

import json
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator

from app.config import database_path

DOCTORS = (
    ("dr-sari", "dr. Sari Wulandari", "Dokter umum", "umum"),
    ("dr-rizky", "dr. Rizky Pratama", "Dokter umum", "umum"),
    ("dr-budi", "dr. Budi Hartono, Sp.PD", "Penyakit dalam", "spesialis"),
    ("dr-maya", "dr. Maya Lestari, Sp.A", "Spesialis anak", "spesialis"),
    ("dr-sari", "dr. Sari Wulandari", "Dokter umum", "tele"),
    ("dr-rizky", "dr. Rizky Pratama", "Dokter umum", "vaksin"),
    ("dr-maya", "dr. Maya Lestari, Sp.A", "Spesialis anak", "vaksin"),
    ("lab-ranah", "Tim Laboratorium Ranah", "Analis laboratorium", "lab"),
)
SERVICE_LABELS = {
    "umum": "Dokter umum",
    "spesialis": "Dokter spesialis",
    "tele": "Telekonsultasi",
    "lab": "Pemeriksaan laboratorium",
    "vaksin": "Vaksinasi",
}
DAILY_TIMES = ("08:00", "09:00", "10:00", "13:00", "14:00", "15:00")


def connect() -> sqlite3.Connection:
    """Open a row-addressable connection with foreign-key checks enabled."""
    path: Path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def connection_scope() -> Iterator[sqlite3.Connection]:
    """Commit successful database work and always release the SQLite handle."""
    connection = connect()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    """Create tables and add demo appointment slots for the coming two weeks."""
    with connection_scope() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doctor_id TEXT NOT NULL,
                doctor_name TEXT NOT NULL,
                specialty TEXT NOT NULL,
                service TEXT NOT NULL,
                starts_at TEXT NOT NULL,
                capacity INTEGER NOT NULL DEFAULT 10 CHECK (capacity > 0),
                UNIQUE (doctor_id, service, starts_at)
            );
            CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_code TEXT NOT NULL UNIQUE,
                queue_number INTEGER NOT NULL,
                service TEXT NOT NULL,
                doctor_id TEXT NOT NULL,
                doctor_name TEXT NOT NULL,
                starts_at TEXT NOT NULL,
                patient_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                coverage TEXT NOT NULL DEFAULT 'Umum',
                complaint TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'scheduled',
                created_at TEXT NOT NULL,
                UNIQUE (doctor_id, starts_at, queue_number)
            );
            CREATE TABLE IF NOT EXISTS chat_sessions (
                conversation_id TEXT PRIMARY KEY,
                context_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        reservation_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(reservations)").fetchall()
        }
        if "coverage" not in reservation_columns:
            connection.execute(
                "ALTER TABLE reservations ADD COLUMN coverage TEXT NOT NULL DEFAULT 'Umum'"
            )
        for offset in range(14):
            slot_date = date.today() + timedelta(days=offset)
            if slot_date.weekday() == 6:
                continue
            for doctor_id, doctor_name, specialty, service in DOCTORS:
                for slot_time in DAILY_TIMES:
                    starts_at = datetime.combine(
                        slot_date, time.fromisoformat(slot_time)
                    ).isoformat(timespec="minutes")
                    connection.execute(
                        """
                        INSERT OR IGNORE INTO schedules
                            (doctor_id, doctor_name, specialty, service, starts_at, capacity)
                        VALUES (?, ?, ?, ?, ?, 10)
                        """,
                        (doctor_id, doctor_name, specialty, service, starts_at),
                    )


def get_chat_context(conversation_id: str) -> dict[str, Any]:
    """Load a single conversation's minimal, non-identifying workflow state."""
    with connection_scope() as connection:
        row = connection.execute(
            "SELECT context_json FROM chat_sessions WHERE conversation_id = ?",
            (conversation_id,),
        ).fetchone()
    return json.loads(row["context_json"]) if row else {}


def save_chat_context(conversation_id: str, context: dict[str, Any]) -> None:
    """Persist workflow state so the patient does not repeat triage answers."""
    with connection_scope() as connection:
        connection.execute(
            """
            INSERT INTO chat_sessions (conversation_id, context_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(conversation_id) DO UPDATE SET
                context_json = excluded.context_json,
                updated_at = excluded.updated_at
            """,
            (
                conversation_id,
                json.dumps(context, ensure_ascii=False),
                datetime.now(timezone.utc).isoformat(),
            ),
        )


def list_schedules(service: str = "", limit: int = 20) -> list[dict[str, Any]]:
    """Return only future slots and calculate remaining capacity from bookings."""
    now = datetime.now().replace(second=0, microsecond=0).isoformat(timespec="minutes")
    query = """
        SELECT s.id, s.doctor_id, s.doctor_name, s.specialty, s.service,
               s.starts_at, s.capacity,
               s.capacity - COUNT(r.id) AS available
        FROM schedules s
        LEFT JOIN reservations r
            ON r.starts_at = s.starts_at
            AND r.doctor_id = s.doctor_id
            AND r.status = 'scheduled'
        WHERE s.starts_at >= ?
    """
    parameters: list[Any] = [now]
    if service:
        query += " AND s.service = ?"
        parameters.append(service)
    query += """
        GROUP BY s.id
        HAVING available > 0
        ORDER BY s.starts_at, s.doctor_name
        LIMIT ?
    """
    parameters.append(limit)
    with connection_scope() as connection:
        rows = connection.execute(query, parameters).fetchall()
    return [dict(row) for row in rows]


def create_reservation(payload: dict[str, Any]) -> dict[str, Any]:
    """Book a real demo slot atomically and return its code and queue number."""
    starts_at = payload["starts_at"]
    with connection_scope() as connection:
        connection.execute("BEGIN IMMEDIATE")
        slot = connection.execute(
            "SELECT * FROM schedules WHERE id = ? AND starts_at = ?",
            (payload["schedule_id"], starts_at),
        ).fetchone()
        if slot is None:
            raise ValueError("Jadwal tidak ditemukan atau sudah tidak tersedia.")
        if slot["service"] != payload["service"]:
            raise ValueError("Layanan tidak sesuai dengan jadwal yang dipilih.")
        queue_number = connection.execute(
            """
            SELECT COALESCE(MAX(queue_number), 0) + 1
            FROM reservations
            WHERE doctor_id = ? AND starts_at = ? AND status = 'scheduled'
            """,
            (slot["doctor_id"], starts_at),
        ).fetchone()[0]
        if queue_number > slot["capacity"]:
            raise ValueError("Jadwal sudah penuh. Silakan pilih waktu lain.")
        booking_code = "RC-" + secrets.token_hex(4).upper()
        connection.execute(
            """
            INSERT INTO reservations (
                booking_code, queue_number, service, doctor_id, doctor_name,
                starts_at, patient_name, phone, coverage, complaint, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                booking_code,
                queue_number,
                slot["service"],
                slot["doctor_id"],
                slot["doctor_name"],
                starts_at,
                payload["patient_name"],
                payload["phone"],
                payload.get("coverage", "Umum"),
                payload.get("complaint", ""),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
    return {
        "booking_code": booking_code,
        "queue_number": queue_number,
        "service": slot["service"],
        "doctor_name": slot["doctor_name"],
        "starts_at": starts_at,
        "patient_name": payload["patient_name"],
        "status": "scheduled",
    }


def list_reservations(limit: int = 100) -> list[dict[str, Any]]:
    """Return a bounded reservation list for an authenticated admin."""
    with connection_scope() as connection:
        rows = connection.execute(
            """
            SELECT booking_code, queue_number, service, doctor_name, starts_at,
                   patient_name, phone, coverage, complaint, status, created_at
            FROM reservations
            ORDER BY starts_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]
