from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class SubscriptionPlan(models.Model):
    name = models.CharField(_('nombre del plan'), max_length=100)
    description = models.TextField(_('descripción'))
    price = models.DecimalField(_('precio (MXN)'), max_digits=8, decimal_places=2)
    duration_days = models.IntegerField(_('duración (días)'), default=30)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Plan de Suscripción'
        verbose_name_plural = 'Planes de Suscripción'

    def __str__(self):
        return f"{self.name} - ${self.price}"


class UserSubscription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='subscriptions', on_delete=models.CASCADE)
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.RESTRICT)
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Suscripción de Usuario'
        verbose_name_plural = 'Suscripciones de Usuarios'

    def __str__(self):
        return f"{self.user.email} - {self.plan.name}"


class PremiumVideo(models.Model):
    title = models.CharField(_('título'), max_length=200)
    description = models.TextField(_('descripción'), blank=True)
    video_url = models.URLField(_('URL del video (Vimeo/Privado)'))
    thumbnail = models.ImageField(_('miniatura del video'), upload_to='premium/thumbnails/', blank=True, null=True)
    release_date = models.DateTimeField()
    is_published = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Video Premium'
        verbose_name_plural = 'Videos Premium'

    def __str__(self):
        return self.title

    @property
    def thumbnail_url(self):
        """Compatibility: returns the URL of the thumbnail or empty string."""
        if self.thumbnail and hasattr(self.thumbnail, 'url'):
            return self.thumbnail.url
        return ''
