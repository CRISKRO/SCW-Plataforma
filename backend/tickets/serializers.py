from rest_framework import serializers
from django.utils import timezone
from .locking import SEAT_HOLD_TTL
from .models import EventZone, Seat

class SeatSerializer(serializers.ModelSerializer):
    is_locked = serializers.SerializerMethodField()
    display_number = serializers.ReadOnlyField()

    class Meta:
        model = Seat
        exclude = ('locked_at', 'locked_by_session')

    def get_is_locked(self, obj):
        if not obj.is_available:
            return True
        if obj.locked_at:
            if timezone.now() < obj.locked_at + SEAT_HOLD_TTL:
                return True
        return False

class EventZoneSerializer(serializers.ModelSerializer):
    seats = SeatSerializer(many=True, read_only=True)

    class Meta:
        model = EventZone
        fields = '__all__'
