from rest_framework import serializers
from .models import Raffle, RaffleTicket

class RaffleTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = RaffleTicket
        fields = ['id', 'number', 'status', 'buyer_name', 'order_item']

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
