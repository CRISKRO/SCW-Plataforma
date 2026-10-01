from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import EventZone, Seat

class SeatSerializer(serializers.ModelSerializer):
    is_locked = serializers.SerializerMethodField()
    display_number = serializers.ReadOnlyField()

    class Meta:
        model = Seat
        fields = '__all__'

    def get_is_locked(self, obj):
        if not obj.is_available:
            return True
        if obj.locked_at:
            if timezone.now() < obj.locked_at + timedelta(minutes=10):
                return True
        return False

class EventZoneSerializer(serializers.ModelSerializer):
    seats = SeatSerializer(many=True, read_only=True)

    class Meta:
        model = EventZone
        fields = '__all__'
