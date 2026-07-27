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
    
    outstanding_balance = models.DecimalField(_('saldo pendiente'), max_digits=10, decimal_places=2, default=0.00)
    penalty_weeks_counted = models.IntegerField(_('semanas de sanción contadas'), default=0)
    last_tuition_charge_date = models.DateField(_('fecha de último cargo mensual'), null=True, blank=True)

    class Meta:
        verbose_name = 'Inscripción al Dojo'
        verbose_name_plural = 'Inscripciones al Dojo'

    def __str__(self):
        return f"Aspirante: {self.name} - {self.get_experience_display()}"

    def update_dynamic_payment_status(self, config=None):
        """Automatically recalculates the payment status and applies penalties."""
        if self.status == 'APPROVED' and self.payment_due_date:
            today = date.today()
            updated_fields = set()
            
            # 1. Aplicar cargo mensual si ya se alcanzó la fecha de corte
            if today >= self.payment_due_date:
                if not self.last_tuition_charge_date or self.last_tuition_charge_date < self.payment_due_date:
                    if config is None:
                        from api.models import get_active_config
                        try:
                            config = get_active_config()
                            tuition_fee = config.tuition_fee
                        except Exception:
                            tuition_fee = 600.00
                    else:
                        tuition_fee = getattr(config, 'tuition_fee', 600.00)
                        
                    self.outstanding_balance += tuition_fee
                    self.last_tuition_charge_date = today
                    updated_fields.update(['outstanding_balance', 'last_tuition_charge_date'])

            # 2. Lógica de estados y recargos
            if self.payment_due_date < today:
                if self.payment_status != 'UNPAID':
                    self.payment_status = 'UNPAID'
                    updated_fields.add('payment_status')
                
                # Sanciones por atraso
                days_overdue = (today - self.payment_due_date).days
                weeks_overdue = days_overdue // 7
                if weeks_overdue > self.penalty_weeks_counted:
                    new_penalties = weeks_overdue - self.penalty_weeks_counted
                    self.outstanding_balance += new_penalties * 50
                    self.penalty_weeks_counted = weeks_overdue
                    updated_fields.update(['outstanding_balance', 'penalty_weeks_counted'])
                    
            elif today <= self.payment_due_date <= today + timedelta(days=5):
                if self.outstanding_balance > 0:
                    if self.payment_status != 'UNPAID':
                        self.payment_status = 'UNPAID'
                        updated_fields.add('payment_status')
                else:
                    if self.payment_status != 'EXPIRING':
                        self.payment_status = 'EXPIRING'
                        updated_fields.add('payment_status')
            else:
                if self.outstanding_balance > 0:
                    if self.payment_status != 'UNPAID':
                        self.payment_status = 'UNPAID'
                        updated_fields.add('payment_status')
                else:
                    if self.payment_status != 'PAID':
                        self.payment_status = 'PAID'
                        updated_fields.add('payment_status')

            if updated_fields:
                self.save(update_fields=list(updated_fields))
