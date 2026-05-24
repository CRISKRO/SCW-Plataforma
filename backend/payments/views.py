import mercadopago
from django.conf import settings
from rest_framework import serializers, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Order, OrderItem
from merch.models import Product
from .serializers import OrderSerializer

class MPPublicKeyView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        return Response({"public_key": settings.MERCADOPAGO_PUBLIC_KEY})

class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1)
    size = serializers.CharField(max_length=100, allow_blank=True, required=False)

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
                product = None
                price = item.get('price', 0)
                name = item.get('name', 'Artículo')
                
                if item.get('product_id'):
                    try:
                        product = Product.objects.get(id=item['product_id'], is_active=True)
                        price = product.price
                        name = product.name
                    except Product.DoesNotExist:
                        # Could be a ticket or other non-DB product item. We rely on the frontend name/price.
                        if not price or not name:
                            return Response({"error": f"Product {item['product_id']} not found or inactive."}, status=status.HTTP_400_BAD_REQUEST)
                
                total_amount += price * item['quantity']
                
                order_items_data.append({
                    'product': product,
                    'product_name': name,
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

            mp_items = []
            for item_data in order_items_data:
                OrderItem.objects.create(
                    order=order,
                    product=item_data['product'],
                    product_name=item_data['product_name'],
                    quantity=item_data['quantity'],
                    price=item_data['price'],
                    size=item_data['size']
                )
                
                commission = getattr(settings, 'MERCADOPAGO_COMMISSION_RATE', 0.0401)
                price_with_commission = round(float(item_data['price']) * (1 + commission), 2)
                size_str = f"({item_data['size']})" if item_data['size'] else ""
                mp_items.append({
                    "title": f"{item_data['product_name']} {size_str}".strip(),
                    "quantity": item_data['quantity'],
                    "currency_id": "MXN",
                    "unit_price": price_with_commission
                })

            # Integrate with MercadoPago SDK to generate a real preference_id
            try:
                mp = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
                preference_data = {
                    "items": mp_items,
                    "payer": {
                        "email": data['contact_email']
                    },
                    "back_urls": {
                        "success": "http://localhost:3000/carrito/success",
                        "failure": "http://localhost:3000/carrito",
                        "pending": "http://localhost:3000/carrito"
                    },
                    "external_reference": str(order.id)
                }
                
                preference_response = mp.preference().create(preference_data)
                preference = preference_response.get("response", {})
                
                init_point = preference.get("init_point", "")
                order.mp_preference_id = preference.get("id", "")
                order.save()

                return Response({
                    "order_id": order.id,
                    "total_amount": total_amount,
                    "init_point": init_point
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                print("Error con Mercado Pago:", e)
                return Response({"error": f"Error de pasarela de pagos: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        print("Serializer Validation Errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer
    permission_classes = [IsAdminUser]

class ProcessCardPaymentView(APIView):
    """Receives card_data token from MP Brick and processes a direct charge."""
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        card_data = data.get('card_data', {})
        contact_email = data.get('contact_email', '')
        contact_phone = data.get('contact_phone', '')
        items_data = data.get('items', [])

        if not card_data or not contact_email or not items_data:
            return Response({"error": "Datos incompletos."}, status=status.HTTP_400_BAD_REQUEST)

        # Build order items and total
        total_amount = 0
        order_items_data = []
        mp_items = []

        for item in items_data:
            product = None
            price = float(item.get('price', 0))
            name = item.get('name', 'Artículo')
            qty = int(item.get('quantity', 1))

            if item.get('product_id'):
                try:
                    product = Product.objects.get(id=item['product_id'], is_active=True)
                    price = float(product.price)
                    name = product.name
                except Product.DoesNotExist:
                    pass

            total_amount += price * qty
            order_items_data.append({'product': product, 'product_name': name, 'quantity': qty, 'price': price, 'size': item.get('size', '')})
            mp_items.append({'title': name, 'quantity': qty, 'unit_price': price, 'currency_id': 'MXN'})

        # Create Order record
        user = request.user if request.user.is_authenticated else None
        order = Order.objects.create(
            user=user,
            contact_email=contact_email,
            contact_phone=contact_phone,
            total_amount=total_amount,
            status=Order.Status.PENDING
        )
        for item_data in order_items_data:
            OrderItem.objects.create(order=order, **item_data)

        # Process payment via MP Payments API
        try:
            mp = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
            payment_data = {
                "transaction_amount": total_amount,
                "token": card_data.get("token"),
                "description": f"SCW Orden #{order.id}",
                "installments": card_data.get("installments", 1),
                "payment_method_id": card_data.get("payment_method_id"),
                "issuer_id": card_data.get("issuer_id"),
                "payer": {
                    "email": contact_email,
                    "identification": card_data.get("payer", {}).get("identification", {}),
                },
            }
            payment_response = mp.payment().create(payment_data)
            payment = payment_response.get("response", {})

            pay_status = payment.get("status", "error")
            order.mp_payment_id = str(payment.get("id", ""))
            if pay_status == "approved":
                order.status = Order.Status.PAID
            order.save()

            return Response({
                "order_id": order.id,
                "status": pay_status,
                "status_detail": payment.get("status_detail", ""),
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print("Error procesando pago:", e)
            order.delete()
            return Response({"error": f"Error de pasarela: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyPaymentView(APIView):
    """Called by frontend after MP redirects back. Verifies payment and sends ticket email."""
    permission_classes = [AllowAny]

    def post(self, request):
        payment_id = request.data.get('payment_id')
        external_reference = request.data.get('external_reference')  # order ID
        mp_status = request.data.get('status')

        if not payment_id or not external_reference:
            return Response({"error": "Faltan datos de verificación."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(id=int(external_reference))
        except (Order.DoesNotExist, ValueError):
            return Response({"error": "Orden no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        # Already processed
        if order.status == Order.Status.PAID:
            return Response({"status": "approved", "already_processed": True, "order_id": order.id})

        # Verify with MP API
        try:
            mp = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
            pay_response = mp.payment().get(int(payment_id))
            payment = pay_response.get("response", {})
            verified_status = payment.get("status", "")

            if verified_status == "approved":
                order.mp_payment_id = str(payment_id)
                order.status = Order.Status.PAID
                order.save()

                # Send ticket email
                try:
                    from .email_tickets import send_ticket_email
                    send_ticket_email(order)
                except Exception as mail_err:
                    print("Email error:", mail_err)

                return Response({"status": "approved", "order_id": order.id})
            else:
                return Response({"status": verified_status, "order_id": order.id})

        except Exception as e:
            print("Verify error:", e)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from django.utils import timezone

class ValidateTicketView(APIView):
    """Scans a QR code at the event entrance to validate a ticket."""
    permission_classes = [AllowAny]

    def post(self, request):
        # Authenticate via SCANNER_TOKEN header
        scanner_token = request.headers.get('X-Scanner-Token')
        expected_token = getattr(settings, 'SCANNER_TOKEN', 'scw-default-secret-token')
        
        # If user is admin or token is correct, allow. Else reject.
        if not (request.user.is_staff or scanner_token == expected_token):
            return Response({"valid": False, "message": "No autorizado para escanear."}, status=403)

        from .qr import validate_ticket_code
        order_id = request.data.get('order_id')
        item_id = request.data.get('item_id')
        code = request.data.get('code')

        if not all([order_id, item_id, code]):
            return Response({"valid": False, "message": "Datos incompletos."}, status=400)

        try:
            item = OrderItem.objects.get(id=int(item_id), order__id=int(order_id))
        except OrderItem.DoesNotExist:
            return Response({"valid": False, "message": "Boleto no encontrado."}, status=404)

        if item.order.status != Order.Status.PAID:
            return Response({"valid": False, "message": "Esta orden no ha sido pagada."})

        if not validate_ticket_code(int(order_id), int(item_id), code):
            return Response({"valid": False, "message": "❌ Código inválido."})

        # Check if already scanned
        if item.is_scanned:
            return Response({"valid": False, "message": "❌ Boleto ya registrado."})

        # Check if event is passed (if linked)
        if item.event and item.event.date_time < timezone.now():
            return Response({"valid": False, "message": "❌ Evento caducado/pasado."})

        # Mark as scanned
        item.is_scanned = True
        item.scanned_at = timezone.now()
        item.save()

        return Response({"valid": True, "message": "✅ Acceso autorizado", "item": item.product_name, "size": item.size})

