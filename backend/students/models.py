from django.db import models
from django.utils.translation import gettext_lazy as _
from datetime import date, timedelta


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
    
    birth_date = models.DateField(_('fecha de nacimiento'), null=True, blank=True)
    address = models.TextField(_('domicilio'), blank=True)
    emergency_contact = models.CharField(_('contacto de emergencia (Nombre y teléfono)'), max_length=200, blank=True)
    medical_conditions = models.TextField(_('padecimientos médicos o lesiones relevantes'), blank=True)
    accepted_rules = models.BooleanField(_('aceptó el reglamento'), default=False)
    
    id_document = models.FileField(_('identificación oficial'), upload_to='enrollments/documents/', blank=True, null=True)
    medical_certificate = models.FileField(_('certificado médico'), upload_to='enrollments/documents/', blank=True, null=True)
    
    status = models.CharField(_('estado'), max_length=20, choices=Status.choices, default=Status.PENDING)

    created_at = models.DateTimeField(auto_now_add=True)
    is_contacted = models.BooleanField(_('ya contactado'), default=False)

    # Campos de control de mensualidad escolar
    payment_status = models.CharField(
        _('estado de pago'),
        max_length=20,
        choices=[
            ('PAID', _('Pagado')),
            ('UNPAID', _('Debe')),
            ('EXPIRING', _('Por vencer')),
        ],
        default='UNPAID'
    )
    last_payment_date = models.DateField(_('fecha de último pago'), null=True, blank=True)
    payment_due_date = models.DateField(_('fecha de próximo vencimiento'), null=True, blank=True)

    class Meta:
        verbose_name = 'Inscripción al Dojo'
        verbose_name_plural = 'Inscripciones al Dojo'

    def __str__(self):
        return f"Aspirante: {self.name} - {self.get_experience_display()}"

    def update_dynamic_payment_status(self):
        """Automatically recalculates the payment status based on the due date."""
        if self.status == 'APPROVED' and self.payment_due_date:
            today = date.today()
            if self.payment_due_date < today:
                if self.payment_status != 'UNPAID':
                    self.payment_status = 'UNPAID'
                    self.save(update_fields=['payment_status'])
            elif today <= self.payment_due_date <= today + timedelta(days=5):
                if self.payment_status != 'EXPIRING':
                    self.payment_status = 'EXPIRING'
                    self.save(update_fields=['payment_status'])
            else:
                if self.payment_status != 'PAID':
                    self.payment_status = 'PAID'
                    self.save(update_fields=['payment_status'])
