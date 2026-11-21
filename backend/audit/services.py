"""Auditoría sin guardar solicitudes, contraseñas, tokens ni datos de pago."""
import logging
import re

from django.utils.crypto import salted_hmac

from .models import AuditLog

logger = logging.getLogger(__name__)

# Nunca persistir rutas que contienen un token de aprobación en la URL.
PRIVATE_PREFIXES = (
    "/api/payments/approve-transfer/",
    "/api/auth/password-reset",
    "/api/auth/login/refresh",
    "/api/auth/send-email-otp",
    "/api/auth/verify-email-otp",
    "/api/auth/send-register",
    "/api/auth/verify-register",
)
SKIP_PREFIXES = ("/api/audit/",)
SKIP_METHODS = {"GET", "HEAD", "OPTIONS"}


def route_action(path):
    """Agrupación explícita. Los cambios en datos se registran por método, no por payload."""
    if path.startswith("/api/tickets/seats/lock_seats/"):
        return "ASIENTOS", "RESERVAR_ASIENTOS"
    if path.startswith("/api/tickets/seats/unlock_seats/"):
        return "ASIENTOS", "LIBERAR_ASIENTOS"
    if path.startswith("/api/tickets/"):
        return "ASIENTOS", "MODIFICAR_MAPA"
    if path.startswith("/api/payments/create-order/"):
        return "PEDIDOS", "CREAR_PEDIDO"
    if path.startswith("/api/payments/webhook/") or path.startswith("/api/payments/stripe-webhook/"):
        return "PAGOS", "NOTIFICACION_PAGO"
    if path.startswith("/api/payments/"):
        return "PAGOS", "OPERACION_PAGO"
    if path.startswith("/api/auth/login/google/"):
        return "ACCESOS", "INICIO_SESION_GOOGLE"
    if path.startswith("/api/auth/users/"):
        return "USUARIOS", "ADMINISTRAR_USUARIO"
    if path.startswith("/api/auth/"):
        return "ACCESOS", "OPERACION_CUENTA"
    if path.startswith("/api/events/"):
        return "CONTENIDO", "GESTION_EVENTOS"
    if path.startswith("/api/"):
        return "ADMINISTRACION", "OPERACION_API"
    return "SITIO", "OTRA_OPERACION"


def record_event(*, request=None, actor=None, category, action, path="", method="",
                 status_code=None, visitor_id="", resource_id="", details=None):
    """Fail-open para no detener compras ni webhooks ante fallos de auditoría."""
    try:
        user = actor or (getattr(request, "user", None) if request is not None else None)
        if not (user and getattr(user, "is_authenticated", False)):
            user = None
        ip = request.META.get("REMOTE_ADDR", "") if request is not None else ""
        source_hash = salted_hmac("scw.audit.source", ip).hexdigest()[:20] if ip else ""
        return AuditLog.objects.create(
            actor=user,
            actor_label=(getattr(user, "email", "") or "")[:254],
            visitor_id=visitor_id[:36] if isinstance(visitor_id, str) else "",
            source_hash=source_hash,
            category=category[:32],
            action=action[:64],
            method=method[:8],
            path=path[:255],
            resource_id=str(resource_id)[:40] if resource_id is not None else "",
            status_code=status_code,
            details=details or {},
        )
    except Exception:
        logger.exception("No se pudo registrar auditoría; operación principal conservada")
        return None


def audit_api_request(request, response):
    path = request.path
    if (request.method in SKIP_METHODS or not path.startswith("/api/")
            or path.startswith(SKIP_PREFIXES)
            or path.startswith(PRIVATE_PREFIXES)):
        return
    # El acceso exitoso se registra con el usuario real desde AuditedTokenObtainPairView.
    if path in ("/api/auth/login/", "/api/auth/login") and response.status_code < 400:
        return
    # Los holds aceptados se registran con ID de asientos y evento en la vista.
    if (path.startswith(("/api/tickets/seats/lock_seats/", "/api/tickets/seats/unlock_seats/"))
            and response.status_code < 400):
        return
    category, action = route_action(path)
    parts = path.strip("/").split("/")
    resource_id = next((part for part in parts[2:] if part.isdigit()), "")
    details = {"resultado": "aceptado" if response.status_code < 400 else "rechazado"}
    # Solo un identificador de orden confiable; nunca registrar response.data completo.
    if action == "CREAR_PEDIDO" and response.status_code == 201:
        payload = getattr(response, "data", None)
        if isinstance(payload, dict) and isinstance(payload.get("order_id"), int):
            resource_id = str(payload["order_id"])
    record_event(
        request=request, category=category, action=action,
        path=path, method=request.method, resource_id=resource_id,
        status_code=response.status_code, details=details,
    )
