from rest_framework import serializers
from .models import Order, OrderItem, Coupon

class CouponSerializer(serializers.ModelSerializer):
    is_valid_now = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = '__all__'

    def get_is_valid_now(self, obj):
        valid, msg = obj.is_valid(subtotal=0)
        # return True if valid except for subtotal requirement
        return valid or "compra mínima" in msg.lower()

    def validate_code(self, value):
        return value.strip().upper()

class OrderItemSerializer(serializers.ModelSerializer):
    ticket_hash = serializers.CharField(read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True, default=None)
    seat_details = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = '__all__'

    def get_seat_details(self, obj):
        if obj.seat:
            return {
                'id': obj.seat.id,
                'row_name': obj.seat.row_name,
                'seat_number': obj.seat.seat_number,
                'zone_type': obj.seat.zone.zone_type if obj.seat.zone else None
            }
        return None

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    coupon_code = serializers.CharField(source='coupon.code', read_only=True)
    
    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('id', 'user', 'contact_email', 'total_amount', 'created_at')

