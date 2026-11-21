from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from events.models import Event
from payments.models import Order, OrderItem
from .models import EventZone, Seat
from .serializers import SeatSerializer
from .views import SeatViewSet


class SeatHoldProtectionTests(TestCase):
    def setUp(self):
        self.event = Event.objects.create(
            title="SCW Test", date_time=timezone.now() + timedelta(days=1),
            location="Arena SCW"
        )
        self.zone = EventZone.objects.create(
            event=self.event, zone_type="CUSTOM", price="100.00",
            rows=0, seats_per_row=0
        )
        self.seats = [
            Seat.objects.create(zone=self.zone, row_name="A", seat_number=i)
            for i in range(1, 21)
        ]
        self.factory = APIRequestFactory()

    def lock(self, ids, session="session123", ip="192.0.2.1", day="ALL"):
        request = self.factory.post("/api/tickets/seats/lock_seats/", {
            "seat_ids": ids, "session_id": session, "day": day
        }, format="json", REMOTE_ADDR=ip)
        return SeatViewSet.as_view({"post": "lock_seats"})(request)

    def test_request_rejects_more_than_six_seats(self):
        response = self.lock([s.id for s in self.seats[:7]])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Seat.objects.filter(locked_at__isnull=False).count(), 0)

    def test_second_session_cannot_take_reserved_seat(self):
        target = self.seats[0]
        self.assertEqual(self.lock([target.id]).status_code, 200)
        self.assertEqual(self.lock([target.id], session="another123").status_code, 409)

    def test_same_session_cannot_accumulate_over_six_seats(self):
        self.assertEqual(self.lock([s.id for s in self.seats[:6]]).status_code, 200)
        self.assertEqual(self.lock([self.seats[6].id]).status_code, 429)

    def test_changing_sessions_does_not_bypass_ip_limit(self):
        self.assertEqual(self.lock([s.id for s in self.seats[:6]]).status_code, 200)
        self.assertEqual(self.lock([s.id for s in self.seats[6:12]], "session456").status_code, 200)
        self.assertEqual(self.lock([self.seats[12].id], "session789").status_code, 429)

    def test_expired_holds_are_reclaimable_and_read_as_unlocked(self):
        seat = self.seats[0]
        self.assertEqual(self.lock([seat.id]).status_code, 200)
        Seat.objects.filter(pk=seat.pk).update(locked_at=timezone.now() - timedelta(minutes=4))
        seat.refresh_from_db()
        self.assertFalse(SeatSerializer(seat).data["is_locked"])
        self.assertEqual(self.lock([seat.id], "another123").status_code, 200)

    def test_relocking_does_not_extend_existing_hold(self):
        seat = self.seats[0]
        self.assertEqual(self.lock([seat.id]).status_code, 200)
        original = Seat.objects.get(pk=seat.pk).locked_at
        self.assertEqual(self.lock([seat.id]).status_code, 200)
        self.assertEqual(Seat.objects.get(pk=seat.pk).locked_at, original)

    def test_other_ip_cannot_unlock_reservation(self):
        seat = self.seats[0]
        self.assertEqual(self.lock([seat.id]).status_code, 200)
        req = self.factory.post("/api/tickets/seats/unlock_seats/", {
            "seat_ids": [seat.id], "session_id": "session123"
        }, format="json", REMOTE_ADDR="198.51.100.1")
        response = SeatViewSet.as_view({"post": "unlock_seats"})(req)
        seat.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(seat.locked_at)

    def test_public_serializer_does_not_leak_session(self):
        self.assertEqual(self.lock([self.seats[0].id]).status_code, 200)
        data = SeatSerializer(Seat.objects.get(pk=self.seats[0].pk)).data
        self.assertNotIn("locked_by_session", data)
        self.assertNotIn("locked_at", data)

    def test_paid_seat_is_never_reclaimed(self):
        seat = self.seats[0]
        order = Order.objects.create(contact_email="test@example.com", total_amount="100.00", status="PAID")
        OrderItem.objects.create(order=order, product_name="Boleto", seat=seat, price="100.00", valid_for_day="ALL")
        self.assertEqual(self.lock([seat.id]).status_code, 409)

    def test_invalid_request_never_locks_partial_selection(self):
        self.assertEqual(self.lock([self.seats[1].id], session="another123").status_code, 200)
        response = self.lock([self.seats[0].id, self.seats[1].id])
        self.assertEqual(response.status_code, 409)
        self.assertIsNone(Seat.objects.get(pk=self.seats[0].pk).locked_at)
