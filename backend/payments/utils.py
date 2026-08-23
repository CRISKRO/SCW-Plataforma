from django.core.mail import get_connection
from django.conf import settings
from api.models import get_active_config
import logging

logger = logging.getLogger(__name__)

def get_smtp_connection(config=None):
    """
    Construye y devuelve una conexión de correo Django (EmailBackend)
    utilizando la configuración activa en la base de datos (SystemConfiguration)
    o alternativamente los valores predeterminados en settings.py.
    
    Maneja correctamente:
    - Puerto 465 (SSL implícito: use_ssl=True, use_tls=False)
    - Puerto 587 (TLS explícito: use_tls=True, use_ssl=False)
    - Timeouts de conexión (15s) para no congelar hilos en PythonAnywhere
    """
    if config is None:
        try:
            config = get_active_config()
        except Exception as e:
            logger.warning(f"No se pudo cargar la configuración de la BD: {e}")
            config = None

    if config:
        host = config.email_host or getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
        port = int(config.email_port or getattr(settings, 'EMAIL_PORT', 587))
        user = config.email_host_user or getattr(settings, 'EMAIL_HOST_USER', '')
        password = config.email_host_password or getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        use_tls_config = config.email_use_tls
    else:
        host = getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
        port = int(getattr(settings, 'EMAIL_PORT', 587))
        user = getattr(settings, 'EMAIL_HOST_USER', '')
        password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        use_tls_config = getattr(settings, 'EMAIL_USE_TLS', True)

    # Determinar parámetros de seguridad SSL / TLS según el puerto
    if port == 465:
        use_ssl = True
        use_tls = False
    elif port == 587:
        use_tls = True
        use_ssl = False
    else:
        use_tls = use_tls_config
        use_ssl = not use_tls

    if not user or not password:
        logger.warning("Credenciales SMTP no configuradas. Intentando conexión por defecto de Django.")
        return get_connection(timeout=15)

    return get_connection(
        host=host,
        port=port,
        username=user,
        password=password,
        use_tls=use_tls,
        use_ssl=use_ssl,
        timeout=15
    )


def ensure_ticket_items_expanded(order):
    """
    Garantiza que todos los boletos (artículos de orden vinculados a un evento)
    con cantidad > 1 se desglosen en registros individuales con cantidad = 1.
    Esto permite que cada boleto tenga su propio ID único, hash de código QR e historial de escaneo.
    """
    from .models import OrderItem
    unexpanded_items = list(order.items.filter(event__isnull=False, quantity__gt=1))
    for item in unexpanded_items:
        qty = item.quantity
        item.quantity = 1
        item.save(update_fields=['quantity'])
        for _ in range(qty - 1):
            OrderItem.objects.create(
                order=order,
                product=item.product,
                product_name=item.product_name,
                quantity=1,
                price=item.price,
                size=item.size,
                is_scanned=item.is_scanned,
                scanned_at=item.scanned_at,
                scanned_day_1_at=item.scanned_day_1_at,
                scanned_day_2_at=item.scanned_day_2_at,
                event=item.event,
                seat=item.seat,
                valid_for_day=item.valid_for_day
            )


def mark_seat_availability_after_payment(seat, valid_for_day='ALL'):
    """
    Marca un asiento como no disponible solo si:
    - Es un evento de 1 día (is_multi_day = False).
    - Es un abono/pase completo ('BOTH' o 'ALL').
    - O ambos días ('DAY_1' y 'DAY_2') ya fueron pagados por separado.
    """
    if not seat:
        return
    from .models import Order, OrderItem
    is_multi = bool(seat.zone and seat.zone.event and seat.zone.event.is_multi_day)
    if not is_multi or valid_for_day in ['ALL', 'BOTH']:
        seat.is_available = False
        seat.save(update_fields=['is_available'])
    else:
        paid_days = set(OrderItem.objects.filter(
            seat=seat,
            order__status=Order.Status.PAID
        ).values_list('valid_for_day', flat=True))
        if ('DAY_1' in paid_days and 'DAY_2' in paid_days) or 'BOTH' in paid_days or 'ALL' in paid_days:
            seat.is_available = False
            seat.save(update_fields=['is_available'])

