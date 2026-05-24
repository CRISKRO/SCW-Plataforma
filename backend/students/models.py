from django.db import models
from django.utils.translation import gettext_lazy as _


class Enrollment(models.Model):
    class ExperienceLevel(models.TextChoices):
        NONE = 'NONE', _('Ninguna')
        BEGINNER = 'BEGINNER', _('Principiante')
        INTERMEDIATE = 'INTERMEDIATE', _('Intermedio')
        ADVANCED = 'ADVANCED', _('Avanzado / Profesional')

    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pendiente')
        APPROVED = 'APPROVED', _('Confirmado')
        REJECTED = 'REJECTED', _('Rechazado')

    name = models.CharField(_('nombre completo'), max_length=200)
    age = models.PositiveIntegerField(_('edad'))
    email = models.EmailField(_('correo electrónico'))
    phone = models.CharField(_('teléfono / WhatsApp'), max_length=20)
    experience = models.CharField(_('nivel de experiencia'), max_length=20, choices=ExperienceLevel.choices, default=ExperienceLevel.NONE)
    message = models.TextField(_('mensaje adicional'), blank=True)
    
    id_document = models.FileField(_('identificación oficial'), upload_to='enrollments/documents/', blank=True, null=True)
    medical_certificate = models.FileField(_('certificado médico'), upload_to='enrollments/documents/', blank=True, null=True)
    
    status = models.CharField(_('estado'), max_length=20, choices=Status.choices, default=Status.PENDING)

    created_at = models.DateTimeField(auto_now_add=True)
    is_contacted = models.BooleanField(_('ya contactado'), default=False)

    class Meta:
        verbose_name = 'Inscripción al Dojo'
        verbose_name_plural = 'Inscripciones al Dojo'

    def __str__(self):
        return f"Aspirante: {self.name} - {self.get_experience_display()}"
