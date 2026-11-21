from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from .models import AuditLog


class AuditAccessTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_superuser(
            email="owner@example.test", password="testpass-superuser"
        )
        self.admin = User.objects.create_user(
            email="admin@example.test", password="testpass-admin",
            role="ADMIN", is_staff=True, is_superuser=False,
        )
        self.client = APIClient()

    def test_anonymous_cannot_read_logs(self):
        response = self.client.get("/api/audit/logs/")
        self.assertIn(response.status_code, (401, 403))

    def test_staff_admin_cannot_read_logs(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get("/api/audit/logs/").status_code, 403)

    def test_superuser_can_read_filtered_logs(self):
        AuditLog.objects.create(actor=self.owner, actor_label=self.owner.email,
                                action="RESERVAR_ASIENTOS", category="ASIENTOS",
                                method="POST", path="/api/tickets/seats/lock_seats/")
        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/api/audit/logs/?category=ASIENTOS")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["results"][0]["actor"]["label"], self.owner.email)

    def test_tracked_page_is_recorded_without_exposing_credentials(self):
        response = self.client.post("/api/audit/track/", {
            "path": "/eventos",
            "visitor_id": "16a40b7e-a98c-44a0-a63c-ead4d304fab9"
        }, format="json")
        self.assertEqual(response.status_code, 201)
        row = AuditLog.objects.get(action="VISITA_PAGINA")
        self.assertIsNone(row.actor)
        self.assertEqual(row.path, "/eventos")
        self.assertNotIn("token", row.details)

    def test_request_body_is_not_saved_and_api_mutations_are_logged(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post("/api/audit/track/", {
            "path": "/admin", "visitor_id": "4af40e73-8dfb-40bb-8e7f-7a2e6c149b4e"
        }, format="json")
        AuditLog.objects.all().delete()
        self.client.post("/api/auth/verify-email-otp/", {
            "code": "secret-otp-value"
        }, format="json")
        self.assertFalse(AuditLog.objects.filter(path="/api/auth/verify-email-otp/").exists())

    def test_invalid_page_path_cannot_include_query_secrets(self):
        response = self.client.post("/api/audit/track/", {
            "path": "/carrito/success?payment_id=secret",
            "visitor_id": "16a40b7e-a98c-44a0-a63c-ead4d304fab9"
        }, format="json")
        self.assertEqual(response.status_code, 400)
