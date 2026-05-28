from django.db import models
from django.utils.translation import gettext_lazy as _

class SystemConfiguration(models.Model):
    # Mercado Pago Settings
    mercadopago_public_key = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        verbose_name=_("Mercado Pago Public Key"),
        help_text=_("Clave pública de Mercado Pago (ej. APP_USR-...)")
    )
    mercadopago_access_token = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        verbose_name=_("Mercado Pago Access Token"),
        help_text=_("Token de acceso de Mercado Pago (ej. APP_USR-...)")
    )
    mercadopago_commission_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4, 
        default=0.0401,
        verbose_name=_("Porcentaje de Comisión"),
        help_text=_("Tasa de comisión extra (ej. 0.0401 para 4.01%)")
    )
    
    # Email Settings
    email_host = models.CharField(
        max_length=255, 
        default='smtp.gmail.com',
        verbose_name=_("Servidor SMTP"),
        help_text=_("Servidor de correo saliente (ej. smtp.gmail.com)")
    )
    email_port = models.IntegerField(
        default=587,
        verbose_name=_("Puerto SMTP"),
        help_text=_("Puerto de conexión (ej. 587 para TLS o 465 para SSL)")
    )
    email_use_tls = models.BooleanField(
        default=True,
        verbose_name=_("Usar TLS"),
        help_text=_("Habilitar seguridad TLS")
    )
    email_host_user = models.EmailField(
        blank=True, 
        null=True,
        verbose_name=_("Usuario de Correo (SMTP)"),
        help_text=_("Dirección de correo electrónico de autenticación")
    )
    email_host_password = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        verbose_name=_("Contraseña de Correo (SMTP)"),
        help_text=_("Contraseña de aplicación o contraseña de correo")
    )
    default_from_email = models.CharField(
        max_length=255, 
        default='SCW Boletos <boletos.scw@gmail.com>',
        verbose_name=_("Remitente por Defecto"),
        help_text=_("Nombre e email del remitente (ej. Nombre <email@dominio.com>)")
    )
    
    # WhatsApp Settings
    whatsapp_service_url = models.CharField(
        max_length=255, 
        default='http://localhost:3001',
        verbose_name=_("URL de WhatsApp API"),
        help_text=_("URL base del microservicio de WhatsApp (ej. http://localhost:3001)")
    )
    whatsapp_enabled = models.BooleanField(
        default=True,
        verbose_name=_("Notificaciones de WhatsApp Activas"),
        help_text=_("Indica si se deben enviar notificaciones por WhatsApp")
    )

    class Meta:
        verbose_name = _("Configuración del Sistema")
        verbose_name_plural = _("Configuraciones del Sistema")

    def __str__(self):
        return "Configuración Global del Sistema"


def get_active_config():
    """
    Singleton retriever to get the active global configuration.
    Creates the first instance if it does not exist yet.
    """
    config, created = SystemConfiguration.objects.get_or_create(id=1)
    return config
