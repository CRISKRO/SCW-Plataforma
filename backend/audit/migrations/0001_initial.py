from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, db_index=True)),
                ("actor_label", models.CharField(blank=True, max_length=254)),
                ("visitor_id", models.CharField(blank=True, max_length=36)),
                ("source_hash", models.CharField(blank=True, max_length=20)),
                ("category", models.CharField(db_index=True, max_length=32)),
                ("action", models.CharField(max_length=64)),
                ("method", models.CharField(blank=True, max_length=8)),
                ("path", models.CharField(blank=True, max_length=255)),
                ("resource_id", models.CharField(blank=True, max_length=40)),
                ("status_code", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("details", models.JSONField(blank=True, default=dict)),
                ("actor", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="audit_logs", to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "ordering": ["-created_at", "-id"],
                "verbose_name": "Registro de auditoría",
                "verbose_name_plural": "Registros de auditoría",
            },
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["-created_at"], name="audit_recent_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["category", "-created_at"], name="audit_category_idx"),
        ),
    ]
