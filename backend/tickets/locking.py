"""Protecciones de reservas temporales de asientos.

Los bloqueos no son ventas: sólo las órdenes pagadas se consideran definitivas.
"""
import re
from datetime import timedelta

from django.utils.crypto import salted_hmac

SEAT_HOLD_TTL = timedelta(minutes=3)
MAX_SEATS_PER_SESSION = 6
MAX_SEATS_PER_IP = 12
VALID_DAYS = {"ALL", "DAY_1", "DAY_2", "BOTH"}
SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{4,64}$")


def client_fingerprint(request):
    # REMOTE_ADDR es el valor no controlado por las cabeceras X-Forwarded-For
    # enviadas por clientes. Usar la IP sólo para un cupo temporal, no para autenticar.
    remote_addr = request.META.get("REMOTE_ADDR") or "unknown"
    return salted_hmac("tickets.seat_holds", remote_addr).hexdigest()[:20]


def lock_owner(session_id, request):
    return f"{session_id}~{client_fingerprint(request)}"


def owned_by_request(lock_value, session_id, request):
    owner = (lock_value or "").split("::", 1)[0]
    # Compatibilidad con bloqueos anteriores al despliegue, hasta su expiración.
    return owner == lock_owner(session_id, request) or owner == session_id
