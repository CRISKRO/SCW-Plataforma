from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from audit.models import AuditLog


class Command(BaseCommand):
    help = "Elimina registros anteriores a N días (ejecutar solo con autorización)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=180)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        days = options["days"]
        if days < 30:
            raise ValueError("El período mínimo de conservación es de 30 días.")
        cutoff = timezone.now() - timedelta(days=days)
        qs = AuditLog.objects.filter(created_at__lt=cutoff)
        count = qs.count()
        if options["dry_run"]:
            self.stdout.write(f"Simulación: {count} registros anteriores a {days} días.")
            return
        deleted, _ = qs.delete()
        self.stdout.write(self.style.SUCCESS(f"{deleted} registros históricos eliminados."))
