from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from merch.models import Product


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pendiente')
        PAID = 'PAID', _('Pagado')
        PROCESSING = 'PROCESSING', _('Preparando')
        SHIPPED = 'SHIPPED', _('Enviado')
        DELIVERED = 'DELIVERED', _('Entregado')
        CANCELLED = 'CANCELLED', _('Cancelado')

    class PaymentMethod(models.TextChoices):
        MERCADOPAGO = 'MERCADOPAGO', _('MercadoPago')
        TRANSFER = 'TRANSFER', _('Transferencia Bancaria')

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='orders', on_delete=models.SET_NULL, null=True, blank=True)
    contact_email = models.EmailField(_('email de contacto'))
    contact_phone = models.CharField(_('teléfono de contacto'), max_length=20, blank=True)

    total_amount = models.DecimalField(_('total (MXN)'), max_digits=10, decimal_places=2)
    status = models.CharField(_('estado'), max_length=15, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(_('método de pago'), max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.MERCADOPAGO)
    transfer_receipt = models.ImageField(_('comprobante de transferencia'), upload_to='receipts/', null=True, blank=True)
    mp_preference_id = models.CharField(_('MercadoPago Preference ID'), max_length=255, blank=True)
    mp_payment_id = models.CharField(_('MercadoPago Payment ID'), max_length=255, blank=True)
    
    # Datos de Envío
    shipping_address = models.CharField(_('Dirección de envío'), max_length=255, blank=True)
    shipping_city = models.CharField(_('Ciudad'), max_length=100, blank=True)
    shipping_state = models.CharField(_('Estado/Provincia'), max_length=100, blank=True)
    shipping_zipcode = models.CharField(_('Código Postal'), max_length=20, blank=True)
    shipping_cost = models.DecimalField(_('Costo de envío cobrado'), max_digits=10, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Orden de Compra'
        verbose_name_plural = 'Órdenes de Compra'

    def __str__(self):
        return f"Orden #{self.id} - {self.contact_email}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField(_('nombre del producto (snapshot)'), max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(_('precio unitario (snapshot)'), max_digits=8, decimal_places=2)
    size = models.CharField(_('talla o variante'), max_length=100, blank=True)
    
    # Nuevos campos para validación de boletos QR
    is_scanned = models.BooleanField(_('ya escaneado'), default=False)
    scanned_at = models.DateTimeField(_('fecha/hora de escaneo'), null=True, blank=True)
    event = models.ForeignKey('events.Event', on_delete=models.SET_NULL, null=True, blank=True, help_text="Vincular a un evento para verificar vigencia")
    seat = models.ForeignKey('tickets.Seat', on_delete=models.SET_NULL, null=True, blank=True, help_text="Vincular a un asiento para bloquearlo tras el pago")

    @property
    def ticket_hash(self):
        from .qr import get_ticket_hash
        return get_ticket_hash(self.order.id, self.id)

    class Meta:
        verbose_name = 'Artículo de Orden'
        verbose_name_plural = 'Artículos de Orden'

    def __str__(self):
        return f"{self.quantity}x {self.product_name} (Orden #{self.order.id})"
