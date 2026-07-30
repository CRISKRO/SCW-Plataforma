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
