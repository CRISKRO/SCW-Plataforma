from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    """Registro de operaciones; jamás contiene cuerpos de petición ni credenciales."""

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="audit_logs"
    )
    actor_label = models.CharField(max_length=254, blank=True)
    visitor_id = models.CharField(max_length=36, blank=True)
    source_hash = models.CharField(max_length=20, blank=True)
    category = models.CharField(max_length=32, db_index=True)
    action = models.CharField(max_length=64)
    method = models.CharField(max_length=8, blank=True)
    path = models.CharField(max_length=255, blank=True)
    resource_id = models.CharField(max_length=40, blank=True)
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["-created_at"], name="audit_recent_idx"),
            models.Index(fields=["category", "-created_at"], name="audit_category_idx"),
        ]
        verbose_name = "Registro de auditoría"
        verbose_name_plural = "Registros de auditoría"

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.action} {self.actor_label or 'Anónimo'}"
