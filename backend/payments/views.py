import mercadopago
from django.conf import settings
from rest_framework import serializers, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Order, OrderItem
from merch.models import Product
from .serializers import OrderSerializer
from api.models import get_active_config

class MPPublicKeyView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        config = get_active_config()
        public_key = config.mercadopago_public_key if config.mercadopago_public_key else settings.MERCADOPAGO_PUBLIC_KEY
        return Response({"public_key": public_key})

class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False, allow_null=True)
    seat_id = serializers.IntegerField(required=False, allow_null=True)
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
                seat = None
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

                if item.get('seat_id'):
                    from tickets.models import Seat
                    try:
                        seat = Seat.objects.get(id=item['seat_id'])
                    except Seat.DoesNotExist:
                        pass
                
                total_amount += price * item['quantity']
                
                order_items_data.append({
                    'product': product,
                    'seat': seat,
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
                    seat=item_data.get('seat'),
                    product_name=item_data['product_name'],
                    quantity=item_data['quantity'],
                    price=item_data['price'],
                    size=item_data['size']
                )
                
                config = get_active_config()
                commission = float(config.mercadopago_commission_rate)
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
                config = get_active_config()
                access_token = config.mercadopago_access_token if config.mercadopago_access_token else settings.MERCADOPAGO_ACCESS_TOKEN
                mp = mercadopago.SDK(access_token)
                frontend_url = request.headers.get('origin', 'http://localhost:3000')
                backend_url = f"{request.scheme}://{request.get_host()}"
                
                preference_data = {
                    "items": mp_items,
                    "payer": {
                        "email": data['contact_email']
                    },
                    "back_urls": {
                        "success": f"{frontend_url}/carrito/success",
                        "failure": f"{frontend_url}/carrito",
                        "pending": f"{frontend_url}/carrito"
                    },
                    "auto_return": "approved",
                    "notification_url": f"{backend_url}/api/payments/webhook/",
                    "external_reference": str(order.id)
                }
                
                preference_response = mp.preference().create(preference_data)
                preference = preference_response.get("response", {})
                
                is_test = access_token.startswith("TEST-") or "test" in data['contact_email'].lower() or "prueba" in data['contact_email'].lower()
                init_point = preference.get("sandbox_init_point") if is_test else preference.get("init_point")
                if not init_point:
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

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        instance = serializer.save()
        if old_status != instance.status:
            if instance.status == 'PAID':
                # Simular lógica de webhook: enviar recibo/boleto
                try:
                    has_tickets = instance.items.filter(seat__isnull=False).exists() or instance.items.filter(product__isnull=True).exists()
                    has_merch = instance.items.filter(product__isnull=False).exists()
                    
                    if has_tickets:
                        from .email_tickets import send_ticket_email
                        send_ticket_email(instance)
                    if has_merch:
                        from .email_orders import send_order_receipt_email
                        send_order_receipt_email(instance)
                except Exception as mail_err:
                    print("Email error simulating PAID status:", mail_err)
            elif instance.status in ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']:
                try:
                    from .email_orders import send_status_update_email
                    send_status_update_email(instance)
                except Exception as e:
                    print("Error sending status update email:", e)

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
            seat = None
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

            if item.get('seat_id'):
                from tickets.models import Seat
                try:
                    seat = Seat.objects.get(id=item['seat_id'])
                except Seat.DoesNotExist:
                    pass

            total_amount += price * qty
            order_items_data.append({'product': product, 'seat': seat, 'product_name': name, 'quantity': qty, 'price': price, 'size': item.get('size', '')})
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
            config = get_active_config()
            access_token = config.mercadopago_access_token if config.mercadopago_access_token else settings.MERCADOPAGO_ACCESS_TOKEN
            mp = mercadopago.SDK(access_token)
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
                for item in order.items.all():
                    if getattr(item, 'seat', None) and item.seat.is_available:
                        item.seat.is_available = False
                        item.seat.save()
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

        if str(external_reference).startswith("SUB_"):
            try:
                sub_id = int(str(external_reference).replace("SUB_", ""))
                from premium.models import UserSubscription
                from django.utils import timezone
                from datetime import timedelta
                subscription = UserSubscription.objects.get(id=sub_id)
            except (UserSubscription.DoesNotExist, ValueError):
                return Response({"error": "Suscripción no encontrada."}, status=status.HTTP_404_NOT_FOUND)

            if subscription.is_active:
                return Response({"status": "approved", "already_processed": True, "subscription_id": subscription.id})

            try:
                config = get_active_config()
                access_token = config.mercadopago_access_token if config.mercadopago_access_token else settings.MERCADOPAGO_ACCESS_TOKEN
                mp = mercadopago.SDK(access_token)
                pay_response = mp.payment().get(int(payment_id))
                payment = pay_response.get("response", {})
                verified_status = payment.get("status", "")

                if verified_status == "approved":
                    subscription.is_active = True
                    subscription.end_date = timezone.now() + timedelta(days=subscription.plan.duration_days)
                    subscription.save()

                    user = subscription.user
                    if getattr(user, 'role', 'USER') == 'USER':
                        user.role = 'PREMIUM'
                        user.save()

                    return Response({"status": "approved", "subscription_id": subscription.id})
                else:
                    return Response({"status": verified_status, "subscription_id": subscription.id})
            except Exception as e:
                print("Verify subscription error:", e)
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if str(external_reference).startswith("TUITION_"):
            try:
                tuition_id = int(str(external_reference).replace("TUITION_", ""))
                from students.models import Enrollment
                from django.utils import timezone
                from datetime import timedelta
                enrollment = Enrollment.objects.get(id=tuition_id)
            except (Enrollment.DoesNotExist, ValueError):
                return Response({"error": "Inscripción no encontrada."}, status=status.HTTP_404_NOT_FOUND)

            try:
                config = get_active_config()
                access_token = config.mercadopago_access_token if config.mercadopago_access_token else settings.MERCADOPAGO_ACCESS_TOKEN
                mp = mercadopago.SDK(access_token)
                pay_response = mp.payment().get(int(payment_id))
                payment = pay_response.get("response", {})
                verified_status = payment.get("status", "")

                if verified_status == "approved":
                    if enrollment.payment_status != 'PAID' or enrollment.last_payment_date != timezone.now().date():
                        enrollment.payment_status = 'PAID'
                        enrollment.last_payment_date = timezone.now().date()
                        enrollment.payment_due_date = timezone.now().date() + timedelta(days=30)
                        enrollment.save()
                        
                        # Automate WhatsApp receipt
                        whatsapp_url = config.whatsapp_service_url if config.whatsapp_service_url else 'https://scw-whatsapp.onrender.com'
                        due_date_str = enrollment.payment_due_date.strftime('%d/%m/%Y')
                        last_payment_str = enrollment.last_payment_date.strftime('%d/%m/%Y')
                        message = (
                            f"🥊 *SCW Dojo — Confirmación de Mensualidad*\n\n"
                            f"¡Hola *{enrollment.name}*!\n\n"
                            f"Te confirmamos que hemos recibido con éxito el pago de tu mensualidad por Mercado Pago el día *{last_payment_str}*.\n\n"
                            f"📅 *Próximo Vencimiento:* {due_date_str}\n\n"
                            f"¡Muchas gracias por seguir entrenando en el SCW Dojo! ¡A seguir dándolo todo en el ring! 🥊⚡"
                        )
                        if config.whatsapp_enabled:
                            import requests
                            try:
                                requests.post(f"{whatsapp_url}/send-message", json={'phone': enrollment.phone, 'message': message}, timeout=8)
                            except Exception as e:
                                print("Error sending tuition receipt:", e)

                    return Response({"status": "approved", "enrollment_id": enrollment.id})
                else:
                    return Response({"status": verified_status, "enrollment_id": enrollment.id})
            except Exception as e:
                print("Verify tuition error:", e)
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            order = Order.objects.get(id=int(external_reference))
        except (Order.DoesNotExist, ValueError):
            return Response({"error": "Orden no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        # Already processed
        if order.status == Order.Status.PAID:
            has_tickets = order.items.filter(seat__isnull=False).exists() or order.items.filter(product__isnull=True, product_name__icontains='Boleto').exists()
            has_merch = order.items.filter(product__isnull=False).exists() or order.items.filter(product__isnull=True).exclude(product_name__icontains='Boleto').exists()
            return Response({
                "status": "approved", 
                "already_processed": True, 
                "order_id": order.id,
                "has_tickets": has_tickets,
                "has_merch": has_merch
            })

        # Verify with MP API
        try:
            config = get_active_config()
            access_token = config.mercadopago_access_token if config.mercadopago_access_token else settings.MERCADOPAGO_ACCESS_TOKEN
            mp = mercadopago.SDK(access_token)
            pay_response = mp.payment().get(int(payment_id))
            payment = pay_response.get("response", {})
            verified_status = payment.get("status", "")

            if verified_status == "approved":
                order.mp_payment_id = str(payment_id)
                order.status = Order.Status.PAID
                order.save()

                # Bloquear asientos
                for item in order.items.all():
                    if getattr(item, 'seat', None) and item.seat.is_available:
                        item.seat.is_available = False
                        item.seat.save()

                # Send ticket/merch email
                try:
                    has_tickets = order.items.filter(seat__isnull=False).exists() or order.items.filter(product__isnull=True).exists()
                    has_merch = order.items.filter(product__isnull=False).exists()
                    
                    if has_tickets:
                        from .email_tickets import send_ticket_email
                        send_ticket_email(order)
                    if has_merch:
                        from .email_orders import send_order_receipt_email
                        send_order_receipt_email(order)
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


class WebhookView(APIView):
    """Webhook para notificaciones asíncronas de Mercado Pago"""
    permission_classes = [AllowAny]

    def post(self, request):
        topic = request.query_params.get("topic") or request.data.get("type")
        
        if topic == "payment":
            payment_id = request.query_params.get("id") or request.data.get("data", {}).get("id")
            if payment_id:
                try:
                    config = get_active_config()
                    access_token = config.mercadopago_access_token if config.mercadopago_access_token else settings.MERCADOPAGO_ACCESS_TOKEN
                    mp = mercadopago.SDK(access_token)
                    pay_response = mp.payment().get(int(payment_id))
                    payment = pay_response.get("response", {})
                    
                    external_reference = payment.get("external_reference")
                    verified_status = payment.get("status", "")
                    
                    if external_reference and verified_status == "approved":
                        if str(external_reference).startswith("SUB_"):
                            sub_id = int(str(external_reference).replace("SUB_", ""))
                            from premium.models import UserSubscription
                            from django.utils import timezone
                            from datetime import timedelta
                            try:
                                subscription = UserSubscription.objects.get(id=sub_id)
                                if not subscription.is_active:
                                    subscription.is_active = True
                                    subscription.end_date = timezone.now() + timedelta(days=subscription.plan.duration_days)
                                    subscription.save()

                                    user = subscription.user
                                    if getattr(user, 'role', 'USER') == 'USER':
                                        user.role = 'PREMIUM'
                                        user.save()
                            except UserSubscription.DoesNotExist:
                                print(f"Subscription {sub_id} not found in webhook")
                        elif str(external_reference).startswith("TUITION_"):
                            tuition_id = int(str(external_reference).replace("TUITION_", ""))
                            from students.models import Enrollment
                            from django.utils import timezone
                            from datetime import timedelta
                            try:
                                enrollment = Enrollment.objects.get(id=tuition_id)
                                if enrollment.payment_status != 'PAID' or enrollment.last_payment_date != timezone.now().date():
                                    enrollment.payment_status = 'PAID'
                                    enrollment.last_payment_date = timezone.now().date()
                                    enrollment.payment_due_date = timezone.now().date() + timedelta(days=30)
                                    enrollment.save()

                                    # Automate WhatsApp receipt
                                    whatsapp_url = config.whatsapp_service_url if config.whatsapp_service_url else 'https://scw-whatsapp.onrender.com'
                                    due_date_str = enrollment.payment_due_date.strftime('%d/%m/%Y')
                                    last_payment_str = enrollment.last_payment_date.strftime('%d/%m/%Y')
                                    message = (
                                        f"🥊 *SCW Dojo — Confirmación de Mensualidad*\n\n"
                                        f"¡Hola *{enrollment.name}*!\n\n"
                                        f"Te confirmamos que hemos recibido con éxito el pago de tu mensualidad por Mercado Pago el día *{last_payment_str}*.\n\n"
                                        f"📅 *Próximo Vencimiento:* {due_date_str}\n\n"
                                        f"¡Muchas gracias por seguir entrenando en el SCW Dojo! ¡A seguir dándolo todo en el ring! 🥊⚡"
                                    )
                                    if config.whatsapp_enabled:
                                        import requests
                                        try:
                                            requests.post(f"{whatsapp_url}/send-message", json={'phone': enrollment.phone, 'message': message}, timeout=8)
                                        except Exception as e:
                                            print("Error sending tuition receipt:", e)

                            except Enrollment.DoesNotExist:
                                print(f"Enrollment {tuition_id} not found in webhook")
                        else:
                            order = Order.objects.get(id=int(external_reference))
                            
                            if order.status != Order.Status.PAID:
                                order.mp_payment_id = str(payment_id)
                                order.status = Order.Status.PAID
                                order.save()

                                # Bloquear asientos
                                for item in order.items.all():
                                    if getattr(item, 'seat', None) and item.seat.is_available:
                                        item.seat.is_available = False
                                        item.seat.save()

                                try:
                                    has_tickets = order.items.filter(seat__isnull=False).exists() or order.items.filter(product__isnull=True, product_name__icontains='Boleto').exists()
                                    has_merch = order.items.filter(product__isnull=False).exists() or order.items.filter(product__isnull=True).exclude(product_name__icontains='Boleto').exists()
                                    
                                    if has_tickets:
                                        from .email_tickets import send_ticket_email
                                        send_ticket_email(order)
                                    if has_merch:
                                        from .email_orders import send_order_receipt_email
                                        send_order_receipt_email(order)
                                except Exception as mail_err:
                                    print("Email error from webhook:", mail_err)
                except Exception as e:
                    print("Webhook error:", e)
        
        return Response({"status": "ok"}, status=200)


from rest_framework.permissions import IsAuthenticated

class MyOrdersView(APIView):
    """Retorna el historial de compras del usuario autenticado"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).order_by('-created_at')
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=200)
