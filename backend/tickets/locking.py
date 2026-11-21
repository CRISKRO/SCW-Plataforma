"""Restricciones de reservas temporales para el mapa de boletos SCW.

Una reserva temporal no sustituye la validación de ventas pagadas.
"""
import re
from datetime import timedelta

SEAT_HOLD_TTL = timedelta(minutes=3)
MAX_SEATS_PER_SESSION = 6
VALID_DAYS = {"ALL", "DAY_1", "DAY_2", "BOTH"}
SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{4,64}$")


def lock_owner(session_id, request):
    # Nunca atar la propiedad a REMOTE_ADDR: el proxy de PythonAnywhere
    # puede compartir la IP entre compradores y cambiar entre solicitudes.
    return session_id


def owned_by_request(lock_value, session_id, request):
    owner = (lock_value or "").split("::", 1)[0]
    # Permitir desbloquear el formato antiguo durante la ventana de transición.
    return owner == session_id or owner.startswith(f"{session_id}~")
