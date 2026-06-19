from django.db import models
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import post_save
from django.dispatch import receiver

class Raffle(models.Model):
    title = models.CharField(_('título'), max_length=200)
    description = models.TextField(_('descripción/bases de la rifa'), blank=True)
    image = models.ImageField(_('imagen del premio'), upload_to='raffles/', blank=True, null=True)
    price = models.DecimalField(_('precio por boleto (MXN)'), max_digits=10, decimal_places=2)
    total_tickets = models.PositiveIntegerField(_('total de boletos'))
    is_active = models.BooleanField(_('activa'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Rifa'
        verbose_name_plural = 'Rifas'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.total_tickets} boletos)"


class RaffleTicket(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', _('Disponible')
        SOLD_ONLINE = 'SOLD_ONLINE', _('Vendido Online')
        SOLD_OFFLINE = 'SOLD_OFFLINE', _('Vendido Físico')

    raffle = models.ForeignKey(Raffle, on_delete=models.CASCADE, related_name='tickets')
    number = models.PositiveIntegerField(_('número de boleto'))
    status = models.CharField(_('estado'), max_length=15, choices=Status.choices, default=Status.AVAILABLE)
    buyer_name = models.CharField(_('nombre del comprador (offline)'), max_length=150, blank=True)
    
    # We will connect to payments.OrderItem later or handle it locally, but it's easier to just store order info here if needed
    order_item = models.ForeignKey('payments.OrderItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='raffle_tickets')

    class Meta:
        verbose_name = 'Boleto de Rifa'
        verbose_name_plural = 'Boletos de Rifa'
        unique_together = ('raffle', 'number')
        ordering = ['number']

    def __str__(self):
        return f"Rifa: {self.raffle.title} - Boleto #{self.number} ({self.get_status_display()})"


@receiver(post_save, sender=Raffle)
def ensure_raffle_tickets(sender, instance, created, **kwargs):
    """
    Signal to create or remove RaffleTickets based on the total_tickets of the Raffle.
    If the number of tickets is increased, new tickets are created.
    If the number is decreased, we remove the extra tickets (only if they are available).
    """
    current_tickets_count = instance.tickets.count()
    target_tickets = instance.total_tickets

    if target_tickets > current_tickets_count:
        # Create missing tickets
        tickets_to_create = []
        for number in range(current_tickets_count + 1, target_tickets + 1):
            tickets_to_create.append(RaffleTicket(raffle=instance, number=number))
        if tickets_to_create:
            RaffleTicket.objects.bulk_create(tickets_to_create)
    
    elif target_tickets < current_tickets_count:
        # Delete tickets above target if they are AVAILABLE
        # We don't delete SOLD tickets, to prevent data loss.
        # This means if they reduce the total_tickets below a sold ticket number, the sold ticket remains.
        excess_tickets = instance.tickets.filter(number__gt=target_tickets, status=RaffleTicket.Status.AVAILABLE)
        excess_tickets.delete()
