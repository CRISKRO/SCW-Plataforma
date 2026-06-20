from rest_framework import serializers
from .models import Raffle, RaffleTicket

class RaffleTicketSerializer(serializers.ModelSerializer):
    contact_email = serializers.SerializerMethodField()
    contact_phone = serializers.SerializerMethodField()

    class Meta:
        model = RaffleTicket
        fields = ['id', 'number', 'status', 'buyer_name', 'order_item', 'contact_email', 'contact_phone']

    def get_contact_email(self, obj):
        if obj.order_item and obj.order_item.order:
            return obj.order_item.order.contact_email
        return None

    def get_contact_phone(self, obj):
        if obj.order_item and obj.order_item.order:
            return obj.order_item.order.contact_phone
        return None

class RaffleSerializer(serializers.ModelSerializer):
    tickets = RaffleTicketSerializer(many=True, read_only=True)

    class Meta:
        model = Raffle
        fields = [
            'id', 'title', 'description', 'image', 'price',
            'total_tickets', 'is_active', 'created_at', 'tickets'
        ]
        read_only_fields = ['created_at']

    def create(self, validated_data):
        raffle = super().create(validated_data)
        # Tickets are automatically created by the post_save signal
        return raffle

    def update(self, instance, validated_data):
        raffle = super().update(instance, validated_data)
        # Tickets are automatically adjusted by the post_save signal
        return raffle
