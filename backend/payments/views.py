from rest_framework import serializers, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Order, OrderItem
from merch.models import Product
from .serializers import OrderSerializer

class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    size = serializers.CharField(max_length=20, allow_blank=True, required=False)

class CreateOrderSerializer(serializers.Serializer):
    contact_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=20, allow_blank=True, required=False)
    items = OrderItemInputSerializer(many=True)

class CreateOrderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            
            # Calculate total and validate products
            total_amount = 0
            order_items_data = []

            for item in data['items']:
                try:
                    product = Product.objects.get(id=item['product_id'], is_active=True)
                except Product.DoesNotExist:
                    return Response({"error": f"Product {item['product_id']} not found or inactive."}, status=status.HTTP_400_BAD_REQUEST)
                
                price = product.price
                total_amount += price * item['quantity']
                
                order_items_data.append({
                    'product': product,
                    'product_name': product.name,
                    'quantity': item['quantity'],
                    'price': price,
                    'size': item.get('size', '')
                })

            # Create Order
            user = request.user if request.user.is_authenticated else None
            
            order = Order.objects.create(
                user=user,
                contact_email=data['contact_email'],
                contact_phone=data.get('contact_phone', ''),
                total_amount=total_amount,
                status=Order.Status.PENDING
            )

            for item_data in order_items_data:
                OrderItem.objects.create(
                    order=order,
                    product=item_data['product'],
                    product_name=item_data['product_name'],
                    quantity=item_data['quantity'],
                    price=item_data['price'],
                    size=item_data['size']
                )

            # TODO: Integrate with MercadoPago SDK to generate a real preference_id
            # For now, simulate it:
            simulated_preference_id = f"MP_PREF_{order.id}_" + "SIMULATED"
            order.mp_preference_id = simulated_preference_id
            order.save()

            return Response({
                "order_id": order.id,
                "total_amount": total_amount,
                "preference_id": simulated_preference_id
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer
    permission_classes = [IsAdminUser]
