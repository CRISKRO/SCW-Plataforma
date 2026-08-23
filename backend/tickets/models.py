from django.db import models
from django.utils.translation import gettext_lazy as _
from events.models import Event

class EventZone(models.Model):
    class ZoneType(models.TextChoices):
        GENERAL = 'GENERAL', _('General')
        NORTE = 'NORTE', _('Norte')
        SUR = 'SUR', _('Sur')
        ESTE = 'ESTE', _('Este')
        OESTE = 'OESTE', _('Oeste')

    event = models.ForeignKey(Event, related_name='zones', on_delete=models.CASCADE)
    zone_type = models.CharField(_('tipo de zona'), max_length=20, choices=ZoneType.choices)
    price = models.DecimalField(_('precio (MXN)'), max_digits=8, decimal_places=2)
    price_abono = models.DecimalField(
        _('precio abono 2 días (MXN)'),
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Precio especial si el usuario compra el abono para los 2 días. Si se deja vacío, se cobrará el precio individual.')
    )
    rows = models.PositiveIntegerField(_('filas'), default=3)
    seats_per_row = models.PositiveIntegerField(_('asientos por fila'), default=10)

    class Meta:
        unique_together = ('event', 'zone_type')
        verbose_name = 'Zona del Evento'
        verbose_name_plural = 'Zonas del Evento'

    def __str__(self):
        return f"{self.get_zone_type_display()} - {self.event.title}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new and self.zone_type != self.ZoneType.GENERAL:
            # Generate seats
            letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            for r in range(self.rows):
                row_name = letters[r] if r < len(letters) else str(r+1)
                for s in range(1, self.seats_per_row + 1):
                    Seat.objects.create(
                        zone=self,
                        row_name=row_name,
                        seat_number=s
                    )

class Seat(models.Model):
    zone = models.ForeignKey(EventZone, related_name='seats', on_delete=models.CASCADE)
    row_name = models.CharField(_('fila'), max_length=10)
    seat_number = models.PositiveIntegerField(_('número'))
    is_available = models.BooleanField(default=True)
    
    # Concurrency locking
    locked_at = models.DateTimeField(null=True, blank=True)
    locked_by_session = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        unique_together = ('zone', 'row_name', 'seat_number')
        ordering = ['row_name', 'seat_number']
        verbose_name = 'Asiento'
        verbose_name_plural = 'Asientos'

    @property
    def display_number(self):
        zt = self.zone.zone_type
        if zt == 'NORTE':
            return self.seat_number
        elif zt == 'ESTE':
            return self.seat_number + 17
        elif zt == 'SUR':
            return self.seat_number + 27
        elif zt == 'OESTE':
            return self.seat_number + 44
        return self.seat_number

    def __str__(self):
        return f"Asiento {self.display_number} - Fila {self.row_name} ({self.zone})"
