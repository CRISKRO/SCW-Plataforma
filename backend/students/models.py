from django.db import models
from django.utils.translation import gettext_lazy as _


class Enrollment(models.Model):
    class ExperienceLevel(models.TextChoices):
        NONE = 'NONE', _('Ninguna')
        BEGINNER = 'BEGINNER', _('Principiante')
        INTERMEDIATE = 'INTERMEDIATE', _('Intermedio')
        ADVANCED = 'ADVANCED', _('Avanzado / Profesional')

    name = models.CharField(_('nombre completo'), max_length=200)
    age = models.PositiveIntegerField(_('edad'))
    email = models.EmailField(_('correo electrónico'))
    phone = models.CharField(_('teléfono / WhatsApp'), max_length=20)
    experience = models.CharField(_('nivel de experiencia'), max_length=20, choices=ExperienceLevel.choices, default=ExperienceLevel.NONE)
    message = models.TextField(_('mensaje adicional'), blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    is_contacted = models.BooleanField(_('ya contactado'), default=False)

    class Meta:
        verbose_name = 'Inscripción al Dojo'
        verbose_name_plural = 'Inscripciones al Dojo'

    def __str__(self):
        return f"Aspirante: {self.name} - {self.get_experience_display()}"
