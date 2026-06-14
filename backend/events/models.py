from django.db import models
from django.utils.translation import gettext_lazy as _


class Fighter(models.Model):
    name = models.CharField(_('nombre de ring'), max_length=100)
    nickname = models.CharField(_('apodo'), max_length=100, blank=True)
    bio = models.TextField(_('biografía'), blank=True)
    weight_kg = models.DecimalField(_('peso (kg)'), max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm = models.IntegerField(_('estatura (cm)'), null=True, blank=True)
    social_network = models.CharField(_('red social'), max_length=100, blank=True)
    signature_move = models.CharField(_('movimiento especial'), max_length=100, blank=True)
    achievements = models.CharField(_('logros'), max_length=200, blank=True)
    image = models.ImageField(_('foto del luchador'), upload_to='fighters/', blank=True, null=True)
    is_active = models.BooleanField(_('activo'), default=True)
    is_student = models.BooleanField(_('es alumno'), default=False)

    class Meta:
        verbose_name = 'Luchador'
        verbose_name_plural = 'Luchadores'

    def __str__(self):
        return self.name

    @property
    def image_url(self):
        """Compatibility: returns the URL of the image or empty string."""
        if self.image and hasattr(self.image, 'url'):
            return self.image.url
        return ''


class Event(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Borrador')
        SCHEDULED = 'SCHEDULED', _('Programado')
        LIVE = 'LIVE', _('En Vivo')
        COMPLETED = 'COMPLETED', _('Finalizado')

    title = models.CharField(_('título del evento'), max_length=200)
    description = models.TextField(_('descripción'), blank=True)
    date_time = models.DateTimeField(_('fecha y hora'))
    location = models.CharField(_('lugar/arena'), max_length=200)
    banner = models.ImageField(_('banner del evento'), upload_to='events/', blank=True, null=True)
    status = models.CharField(_('estado'), max_length=15, choices=Status.choices, default=Status.DRAFT)
    ticket_link = models.URLField(_('link de boletos (externo, opcional)'), blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Evento'
        verbose_name_plural = 'Eventos'

    def __str__(self):
        return f"{self.title} - {self.date_time.strftime('%Y-%m-%d')}"

    @property
    def banner_url(self):
        """Compatibility: returns the URL of the banner or empty string."""
        if self.banner and hasattr(self.banner, 'url'):
            return self.banner.url
        return ''


class Match(models.Model):
    event = models.ForeignKey(Event, related_name='matches', on_delete=models.CASCADE)
    match_type = models.CharField(_('tipo de lucha'), max_length=100, default='Mano a Mano')
    order = models.PositiveIntegerField(_('orden en cartelera'), default=1)

    fighters = models.ManyToManyField(Fighter, related_name='matches')
    result_summary = models.TextField(_('resumen del resultado'), blank=True)

    class Meta:
        ordering = ['order']
        verbose_name = 'Lucha'
        verbose_name_plural = 'Luchas'

    def __str__(self):
        return f"Lucha {self.order}: {self.match_type} en {self.event.title}"

class Chronicle(models.Model):
    event = models.ForeignKey(Event, related_name='chronicles', on_delete=models.SET_NULL, null=True, blank=True, verbose_name=_('evento relacionado'))
    title = models.CharField(_('título'), max_length=200)
    content = models.TextField(_('contenido/reseña'))
    writer = models.CharField(_('escritor'), max_length=100)
    photographer = models.CharField(_('fotógrafo'), max_length=100, blank=True)
    image = models.ImageField(_('imagen principal'), upload_to='chronicles/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Crónica'
        verbose_name_plural = 'Crónicas'

    def __str__(self):
        return self.title

    @property
    def image_url(self):
        if self.image and hasattr(self.image, 'url'):
            return self.image.url
        return ''
