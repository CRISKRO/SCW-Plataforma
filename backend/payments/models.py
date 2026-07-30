from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from merch.models import Product


from django.utils import timezone
from decimal import Decimal


class Coupon(models.Model):
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'PERCENTAGE', _('Porcentaje (%)')
        FIXED = 'FIXED', _('Monto Fijo ($)')

    code = models.CharField(_('código'), max_length=50, unique=True)
    discount_type = models.CharField(_('tipo de descuento'), max_length=15, choices=DiscountType.choices, default=DiscountType.PERCENTAGE)
    discount_value = models.DecimalField(_('valor de descuento'), max_digits=10, decimal_places=2)
    min_purchase_amount = models.DecimalField(_('compra mínima (MXN)'), max_digits=10, decimal_places=2, default=0.00)
    max_discount_amount = models.DecimalField(_('descuento máximo (MXN)'), max_digits=10, decimal_places=2, null=True, blank=True)
    max_uses = models.PositiveIntegerField(_('usos máximos'), null=True, blank=True)
    uses_count = models.PositiveIntegerField(_('usos acumulados'), default=0)
    valid_from = models.DateTimeField(_('válido desde'), null=True, blank=True)
    valid_until = models.DateTimeField(_('válido hasta'), null=True, blank=True)
    is_active = models.BooleanField(_('activo'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Cupón'
        verbose_name_plural = 'Cupones'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} ({self.get_discount_type_display()} {self.discount_value})"

    def is_valid(self, subtotal=0):
        now = timezone.now()
        if not self.is_active:
            return False, "El cupón no está activo."
        if self.valid_from and now < self.valid_from:
            return False, "El cupón aún no está vigente."
        if self.valid_until and now > self.valid_until:
            return False, "El cupón ha expirado."
        if self.max_uses is not None and self.uses_count >= self.max_uses:
            return False, "El cupón ha alcanzado el límite de usos."
        if Decimal(str(subtotal)) < self.min_purchase_amount:
            return False, f"La compra mínima para este cupón es de ${self.min_purchase_amount:.2f} MXN."
        return True, "Cupón válido."

    def calculate_discount(self, subtotal):
        subtotal_dec = Decimal(str(subtotal))
        if self.discount_type == self.DiscountType.PERCENTAGE:
            discount = (subtotal_dec * Decimal(str(self.discount_value))) / Decimal('100.00')
            if self.max_discount_amount and discount > self.max_discount_amount:
                discount = Decimal(str(self.max_discount_amount))
        else:
            discount = Decimal(str(self.discount_value))

        return min(discount, subtotal_dec)


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
        STRIPE = 'STRIPE', _('Stripe (Tarjeta)')
        TRANSFER = 'TRANSFER', _('Transferencia Bancaria')
        BOX_OFFICE = 'BOX_OFFICE', _('Taquilla')
        COURTESY = 'COURTESY', _('Cortesía')

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='orders', on_delete=models.SET_NULL, null=True, blank=True)
    contact_email = models.EmailField(_('email de contacto'))
    contact_phone = models.CharField(_('teléfono de contacto'), max_length=20, blank=True)
    contact_name = models.CharField(_('nombre de contacto'), max_length=255, blank=True, default='')

    total_amount = models.DecimalField(_('total (MXN)'), max_digits=10, decimal_places=2)
    coupon = models.ForeignKey(Coupon, related_name='orders', on_delete=models.SET_NULL, null=True, blank=True)
    discount_amount = models.DecimalField(_('descuento (MXN)'), max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(_('estado'), max_length=15, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(_('método de pago'), max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.MERCADOPAGO)
    transfer_receipt = models.FileField(_('comprobante de transferencia'), upload_to='receipts/', null=True, blank=True)
    mp_preference_id = models.CharField(_('MercadoPago Preference ID'), max_length=255, blank=True)
    mp_payment_id = models.CharField(_('MercadoPago Payment ID'), max_length=255, blank=True)
    stripe_session_id = models.CharField(_('Stripe Session ID'), max_length=255, blank=True)
    stripe_payment_intent = models.CharField(_('Stripe Payment Intent ID'), max_length=255, blank=True)
    
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
