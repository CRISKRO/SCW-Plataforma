from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from .managers import CustomUserManager

class Role(models.TextChoices):
    SUPERADMIN = 'SUPERADMIN', _('Super Administrador')
    ADMIN = 'ADMIN', _('Administrador')
    REPORTER = 'REPORTER', _('Reportero')
    STUDENT = 'STUDENT', _('Alumno')
    PREMIUM = 'PREMIUM', _('Usuario Premium')
    STAFF = 'STAFF', _('Staff de Eventos')
    USER = 'USER', _('Usuario Regular')

class CustomUser(AbstractUser):
    username = None # Remove the default username field
    email = models.EmailField(_('email address'), unique=True)
    
    # Custom fields requested
    phone_number = models.CharField(_('número de teléfono'), max_length=20, blank=True, null=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.USER,
        verbose_name=_('rol')
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name'] # Email and password are required by default

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

class EmailVerification(models.Model):
    user = models.OneToOneField(CustomUser, related_name='email_verification', on_delete=models.CASCADE)
    code = models.CharField(_('código'), max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"OTP para {self.user.email}"
