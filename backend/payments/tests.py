from django.test import TestCase
from rest_framework.test import APIRequestFactory

from .models import Order
from .views import CreateOrderView


class CheckoutSeatLimitTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_cannot_block_entire_map_by_creating_large_pending_order(self):
        req = self.factory.post("/api/payments/create-order/", {
            "contact_email": "buyer@example.com",
            "items": [
                {"seat_id": index, "quantity": 1, "valid_for_day": "ALL"}
                for index in range(1, 8)
            ]
        }, format="json")
        response = CreateOrderView.as_view()(req)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_cannot_duplicate_seat_in_pending_order(self):
        req = self.factory.post("/api/payments/create-order/", {
            "contact_email": "buyer@example.com",
            "items": [
                {"seat_id": 1, "quantity": 1, "valid_for_day": "ALL"},
                {"seat_id": 1, "quantity": 1, "valid_for_day": "ALL"},
            ]
        }, format="json")
        response = CreateOrderView.as_view()(req)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)
