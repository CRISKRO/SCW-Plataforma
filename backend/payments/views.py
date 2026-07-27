import mercadopago
from django.conf import settings
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Order, OrderItem, Coupon
from merch.models import Product
from .serializers import OrderSerializer, CouponSerializer
from api.models import get_active_config

def send_order_emails_safely(order):
    has_tickets = order.items.filter(event__isnull=False).exists()
    has_merch = order.items.filter(product__isnull=False).exists()
    has_raffles = order.items.filter(raffle_tickets__isnull=False).exists()
    
    if has_tickets:
        try:
            from .email_tickets import send_ticket_email
            send_ticket_email(order)
        except Exception as e:
            print("Email error (tickets):", e)
            
    if has_merch or has_raffles:
        try:
            if has_tickets:
                import time
                time.sleep(2) # Prevenir bloqueo del SMTP por enviar 2 correos seguidos muy rapido
            from .email_orders import send_order_receipt_email
            send_order_receipt_email(order)
        except Exception as e:
            print("Email error (merch):", e)

    if has_merch:
        try:
            import time
            time.sleep(2) # Prevenir bloqueo del SMTP
            from .email_orders import send_new_merch_admin_email
            send_new_merch_admin_email(order)
        except Exception as e:
            print("Email error (admin merch alert):", e)


class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUser]


class ValidateCouponView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from decimal import Decimal
        code = request.data.get('code', '').strip().upper()
        subtotal = request.data.get('subtotal', 0)

        if not code:
            return Response({'valid': False, 'message': 'Por favor ingresa un código de cupón.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            coupon = Coupon.objects.get(code__iexact=code)
        except Coupon.DoesNotExist:
            return Response({'valid': False, 'message': 'El cupón ingresado no existe.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            subtotal_dec = Decimal(str(subtotal))
        except (ValueError, TypeError):
            subtotal_dec = Decimal('0.00')

        valid, message = coupon.is_valid(subtotal=subtotal_dec)
        if not valid:
            return Response({'valid': False, 'message': message}, status=status.HTTP_400_BAD_REQUEST)

        discount_amount = coupon.calculate_discount(subtotal_dec)
        final_subtotal = max(Decimal('0.00'), subtotal_dec - discount_amount)

        return Response({
            'valid': True,
            'code': coupon.code,
            'discount_type': coupon.discount_type,
            'discount_value': str(coupon.discount_value),
            'discount_amount': float(discount_amount),
            'final_subtotal': float(final_subtotal),
            'message': '¡Cupón aplicado correctamente!'
        }, status=status.HTTP_200_OK)


class ApproveTransferView(APIView):
    """Allows admins to approve transfer orders directly via a secure email link."""
    permission_classes = [AllowAny]

    def get(self, request, token):
        from django.core.signing import Signer, BadSignature
        from django.http import HttpResponse
        signer = Signer()
        try:
            order_id = signer.unsign(token)
            order = Order.objects.get(id=int(order_id))
        except (BadSignature, Order.DoesNotExist, ValueError):
            return HttpResponse("Enlace inválido o expirado.", status=400)

        if order.status == Order.Status.PAID:
            html = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><title>Transferencia Aprobada</title></head>
            <body style="background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
                <h1 style="color:#16a34a;">✅ Orden #{order.id} ya estaba aprobada.</h1>
            </body>
            </html>
            """
            return HttpResponse(html)

        if order.payment_method != 'TRANSFER':
            return HttpResponse("Esta orden no es de transferencia.")

        # Verificar si algún asiento de esta orden ya fue vendido en otra orden pagada
        conflicting_seats = []
        for item in order.items.all():
            if getattr(item, 'seat', None):
                already_sold = OrderItem.objects.filter(
                    seat=item.seat,
                    order__status=Order.Status.PAID
                ).exclude(order=order).exists()
                
                if not item.seat.is_available or already_sold:
                    conflicting_seats.append(f"Fila {item.seat.row_name} - Asiento {item.seat.display_number}")

        if conflicting_seats:
            seats_str = ", ".join(conflicting_seats)
            html = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><title>Error al Aprobar Transferencia</title></head>
            <body style="background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
                <h1 style="color:#ef4444;">⚠️ No se puede aprobar la Orden #{order.id}</h1>
                <p style="font-size:18px;margin-top:20px;">Uno o más asientos de esta orden ya fueron vendidos en otra orden pagada:</p>
                <p style="font-size:20px;font-weight:bold;color:#fca5a5;margin:20px 0;">{seats_str}</p>
                <p style="color:#aaa;">Para evitar sobreventa de boletos, la orden no fue aprobada. Ponte en contacto con el cliente para reasignar sus asientos o cancelar la orden.</p>
            </body>
            </html>
            """
            return HttpResponse(html, status=400)

        # Approve order
        order.status = Order.Status.PAID
        order.save()

        # Deduct seats and stock
        for item in order.items.all():
            if getattr(item, 'seat', None):
                item.seat.is_available = False
                item.seat.save()
            if item.product:
                product = item.product
                if product.is_clothing:
                    size = item.size
                    if size and isinstance(product.stock_by_size, dict) and size in product.stock_by_size:
                        product.stock_by_size[size] = max(0, product.stock_by_size[size] - item.quantity)
                        product.save(update_fields=['stock_by_size'])
                else:
                    product.stock = max(0, product.stock - item.quantity)
                    product.save(update_fields=['stock'])

        # Process Raffle tickets
        for item in order.items.all():
            if hasattr(item, 'raffle_tickets'):
                from raffles.models import RaffleTicket
                for rt in item.raffle_tickets.all():
                    rt.status = RaffleTicket.Status.SOLD_ONLINE
                    rt.buyer_name = order.user.get_full_name() if order.user else order.contact_email
                    rt.save()

        send_order_emails_safely(order)

        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>Transferencia Aprobada</title></head>
        <body style="background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
            <h1 style="color:#16a34a;">✅ Orden #{order.id} Aprobada Exitosamente</h1>
            <p>Se ha confirmado el pago y se han enviado los boletos o recibos correspondientes al usuario.</p>
        </body>
        </html>
        """
        return HttpResponse(html)


class MPPublicKeyView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        config = get_active_config()
        public_key = config.mercadopago_public_key if config.mercadopago_public_key else settings.MERCADOPAGO_PUBLIC_KEY
        shipping_cost = config.shipping_cost if hasattr(config, 'shipping_cost') else 0.00
        return Response({'public_key': public_key, 'shipping_cost': str(shipping_cost)})

class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False, allow_null=True)
    seat_id = serializers.IntegerField(required=False, allow_null=True)
    event_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(default=1)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0.00)
    size = serializers.CharField(max_length=100, allow_blank=True, required=False, default='')
    name = serializers.CharField(max_length=200, required=False, default='')
    raffle_ticket_id = serializers.IntegerField(required=False, allow_null=True)

class CreateOrderSerializer(serializers.Serializer):
    contact_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=20, allow_blank=True, required=False)
    contact_name = serializers.CharField(max_length=255, allow_blank=True, required=False)
    
    # Shipping fields
    shipping_address = serializers.CharField(max_length=255, allow_blank=True, required=False)
    shipping_city = serializers.CharField(max_length=100, allow_blank=True, required=False)
    shipping_state = serializers.CharField(max_length=100, allow_blank=True, required=False)
    shipping_zipcode = serializers.CharField(max_length=20, allow_blank=True, required=False)
    shipping_cost = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0.00)
    
    payment_method = serializers.CharField(max_length=20, required=False, default='MERCADOPAGO')
    transfer_receipt = serializers.FileField(required=False, allow_null=True)
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    items = serializers.JSONField(required=False) # Fallback handling in view

class CreateOrderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Handle multipart/form-data JSON strings for items
        # Convert QueryDict to a regular dict to safely assign a list
        if hasattr(request.data, 'dict'):
            data = {k: request.data.get(k) for k in request.data.keys()}
        else:
            data = request.data.copy()
            
        if isinstance(data.get('items'), str):
            import json
            try:
                data['items'] = json.loads(data['items'])
            except json.JSONDecodeError:
                pass
                
        serializer = CreateOrderSerializer(data=data)
        if serializer.is_valid():
            data = serializer.validated_data
            
            # Use standard parser for items
            items_data = data.get('items', [])
            
            # Calculate total and validate products
            total_amount = 0
            order_items_data = []

            for item in items_data:
                product = None
                seat = None
                event_obj = None
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
                        event_obj = seat.zone.event

                        if not seat.is_available:
                            return Response({
                                "error": f"El asiento {seat.display_number} (Fila {seat.row_name}) ya fue vendido y no está disponible."
                            }, status=status.HTTP_400_BAD_REQUEST)

                        # Verificar si el asiento pertenece a una orden ya pagada
                        paid_item = OrderItem.objects.filter(
                            seat=seat,
                            order__status=Order.Status.PAID
                        ).first()
                        if paid_item:
                            return Response({
                                "error": f"El asiento {seat.display_number} (Fila {seat.row_name}) ya fue pagado en otra orden."
                            }, status=status.HTTP_400_BAD_REQUEST)

                        # Verificar si el asiento pertenece a una orden de transferencia/pago pendiente activa
                        pending_item = OrderItem.objects.filter(
                            seat=seat,
                            order__status=Order.Status.PENDING
                        ).exclude(order__status=Order.Status.CANCELLED).first()
                        if pending_item:
                            return Response({
                                "error": f"El asiento {seat.display_number} (Fila {seat.row_name}) se encuentra reservado en una orden pendiente de confirmación."
                            }, status=status.HTTP_400_BAD_REQUEST)

                    except Seat.DoesNotExist:
                        return Response({
                            "error": f"El asiento seleccionado no existe."
                        }, status=status.HTTP_400_BAD_REQUEST)
                        
                if item.get('event_id') and not event_obj:
                    from events.models import Event
                    try:
                        event_obj = Event.objects.get(id=item['event_id'])
                    except Event.DoesNotExist:
                        pass
                
                raffle_ticket = None
                if item.get('raffle_ticket_id'):
                    from raffles.models import RaffleTicket
                    try:
                        raffle_ticket = RaffleTicket.objects.get(id=item['raffle_ticket_id'], status=RaffleTicket.Status.AVAILABLE)
                        price = raffle_ticket.raffle.price
                        name = f"{raffle_ticket.raffle.title} - Boleto #{raffle_ticket.number}"
                    except RaffleTicket.DoesNotExist:
                        return Response({"error": f"Raffle ticket {item['raffle_ticket_id']} not found or already sold."}, status=status.HTTP_400_BAD_REQUEST)
                
                total_amount += float(price) * item['quantity']
                
                order_items_data.append({
                    'product': product,
                    'seat': seat,
                    'event': event_obj,
                    'raffle_ticket': raffle_ticket,
                    'product_name': name,
                    'quantity': item['quantity'],
                    'price': price,
                    'size': item.get('size', '')
                })

            from decimal import Decimal
            coupon_obj = None
            discount_amount = Decimal('0.00')
            raw_coupon_code = data.get('coupon_code', '').strip()
            if raw_coupon_code:
                try:
                    c = Coupon.objects.get(code__iexact=raw_coupon_code)
                    valid, msg = c.is_valid(subtotal=Decimal(str(total_amount)))
                    if valid:
                        coupon_obj = c
                        discount_amount = c.calculate_discount(Decimal(str(total_amount)))
                    else:
                        return Response({"error": f"Cupón no válido: {msg}"}, status=status.HTTP_400_BAD_REQUEST)
                except Coupon.DoesNotExist:
                    return Response({"error": "El cupón ingresado no existe."}, status=status.HTTP_400_BAD_REQUEST)

            # Create Order
            user = request.user if request.user.is_authenticated else None
            
            if user:
                if data.get('contact_phone'):
                    user.phone_number = data['contact_phone']
                if data.get('shipping_address'):
                    user.address = data['shipping_address']
                    user.city = data.get('shipping_city', '')
                    user.state = data.get('shipping_state', '')
                    user.zipcode = data.get('shipping_zipcode', '')
                user.save()

            shipping_cost_val = Decimal(str(data.get('shipping_cost', 0)))
            subtotal_after_discount = max(Decimal('0.00'), Decimal(str(total_amount)) - discount_amount)
            final_order_total = subtotal_after_discount + shipping_cost_val
            
            order = Order.objects.create(
                user=user,
                contact_email=data.get('contact_email', ''),
                contact_phone=data.get('contact_phone', ''),
                contact_name=data.get('contact_name', ''),
                shipping_address=data.get('shipping_address', ''),
                shipping_city=data.get('shipping_city', ''),
                shipping_state=data.get('shipping_state', ''),
                shipping_zipcode=data.get('shipping_zipcode', ''),
                shipping_cost=shipping_cost_val,
                coupon=coupon_obj,
                discount_amount=discount_amount,
                total_amount=final_order_total,
                status=Order.Status.PENDING,
                payment_method=data.get('payment_method', 'MERCADOPAGO'),
                transfer_receipt=data.get('transfer_receipt')
            )

            if coupon_obj:
                coupon_obj.uses_count += 1
                coupon_obj.save(update_fields=['uses_count'])

            mp_items = []
            discount_ratio = (subtotal_after_discount / Decimal(str(total_amount))) if total_amount > 0 else Decimal('1.00')

            for item_data in order_items_data:
                order_item = OrderItem.objects.create(
                    order=order,
                    product=item_data['product'],
                    seat=item_data.get('seat'),
                    event=item_data.get('event'),
                    product_name=item_data['product_name'],
                    quantity=item_data['quantity'],
                    price=item_data['price'],
                    size=item_data['size']
                )
                
                if item_data.get('raffle_ticket'):
                    rt = item_data['raffle_ticket']
                    rt.order_item = order_item
                    rt.save()
                
                config = get_active_config()
                commission = float(config.mercadopago_commission_rate)
                
                # Merch products need commission added at checkout. Tickets already include it.
                if item_data.get('product'):
                    base_price = float(item_data['price']) * (1 + commission)
                else:
                    base_price = float(item_data['price'])
                
                # Apply discount ratio to mp unit price
                price_with_commission_and_discount = round(base_price * float(discount_ratio), 2)
                
                size_str = f"({item_data['size']})" if item_data['size'] else ""
                mp_items.append({
                    "title": f"{item_data['product_name']} {size_str}".strip(),
                    "quantity": item_data['quantity'],
                    "currency_id": "MXN",
                    "unit_price": price_with_commission_and_discount
                })

            shipping_cost = data.get('shipping_cost', 0)
            if shipping_cost > 0:
                mp_items.append({
                    "title": "Costo de Envío",
                    "quantity": 1,
                    "currency_id": "MXN",
                    "unit_price": float(shipping_cost) * (1 + commission)
                })

            if order.payment_method == 'TRANSFER':
                try:
                    from .email_orders import send_transfer_admin_email
                    send_transfer_admin_email(order, request)
                except Exception as mail_err:
                    print("Error sending admin transfer email:", mail_err)
                    
                return Response({
                    "order_id": order.id,
                    "total_amount": total_amount,
                    "payment_method": "TRANSFER",
                    "init_point": None
                }, status=status.HTTP_201_CREATED)

            # Integrate with MercadoPago SDK to generate a real preference_id
            try:
                config = get_active_config()
                access_token = config.mercadopago_access_token if config.mercadopago_access_token else settings.MERCADOPAGO_ACCESS_TOKEN
                if not access_token:
                    raise Exception("No Mercado Pago Access Token configured.")
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
                
                is_test = (access_token and access_token.startswith("TEST-")) or "test" in data['contact_email'].lower() or "prueba" in data['contact_email'].lower()
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
    queryset = Order.objects.select_related('coupon', 'user').prefetch_related('items__event', 'items__seat__zone').all().order_by('-created_at')
    serializer_class = OrderSerializer
    permission_classes = [IsAdminUser]

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        new_status = serializer.validated_data.get('status', old_status)

        if old_status != new_status and new_status == 'PAID':
            conflicting_items = []
            for item in serializer.instance.items.all():
                if getattr(item, 'seat', None):
                    already_sold = OrderItem.objects.filter(
                        seat=item.seat,
                        order__status=Order.Status.PAID
                    ).exclude(order=serializer.instance).exists()

                    if not item.seat.is_available or already_sold:
                        conflicting_items.append(f"Fila {item.seat.row_name} - Asiento {item.seat.display_number}")

            if conflicting_items:
                raise serializers.ValidationError({
                    "status": f"No se puede marcar como PAGADA. Los siguientes asientos ya fueron vendidos en otra orden pagada: {', '.join(conflicting_items)}"
                })

        instance = serializer.save()
        if old_status != instance.status:
            if instance.status == 'PAID':
                # Simular lógica de webhook: enviar recibo/boleto y descontar asientos
                try:
                    for item in instance.items.all():
                        if getattr(item, 'seat', None):
                            item.seat.is_available = False
                            item.seat.save()
                        if item.product:
                            product = item.product
                            if product.is_clothing:
                                size = item.size
                                if size and isinstance(product.stock_by_size, dict) and size in product.stock_by_size:
                                    product.stock_by_size[size] = max(0, product.stock_by_size[size] - item.quantity)
                                    product.save(update_fields=['stock_by_size'])
                            else:
                                product.stock = max(0, product.stock - item.quantity)
                                product.save(update_fields=['stock'])
                        
                        # Process Raffle tickets
                        if hasattr(item, 'raffle_tickets'):
                            from raffles.models import RaffleTicket
                            for rt in item.raffle_tickets.all():
                                rt.status = RaffleTicket.Status.SOLD_ONLINE
                                rt.buyer_name = instance.user.get_full_name() if instance.user else instance.contact_email
                                rt.save()

                    send_order_emails_safely(instance)
                except Exception as mail_err:
                    print("Email error simulating PAID status:", mail_err)
            elif instance.status in ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']:
                try:
                    from .email_orders import send_status_update_email
                    send_status_update_email(instance)
                except Exception as e:
                    print("Error sending status update email:", e)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def resend_email(self, request, pk=None):
        order = self.get_object()
        try:
            send_order_emails_safely(order)
            return Response({"success": True, "message": f"Boletos / Recibo de la orden #{order.id} reenviados a {order.contact_email}."})
        except Exception as e:
            return Response({"error": f"Error al reenviar correo: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            event_obj = None
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
                    event_obj = seat.zone.event

                    if not seat.is_available:
                        return Response({
                            "error": f"El asiento {seat.display_number} (Fila {seat.row_name}) ya fue vendido."
                        }, status=status.HTTP_400_BAD_REQUEST)

                    paid_item = OrderItem.objects.filter(
                        seat=seat,
                        order__status=Order.Status.PAID
                    ).first()
                    if paid_item:
                        return Response({
                            "error": f"El asiento {seat.display_number} (Fila {seat.row_name}) ya fue pagado en otra orden."
                        }, status=status.HTTP_400_BAD_REQUEST)

                    pending_item = OrderItem.objects.filter(
                        seat=seat,
                        order__status=Order.Status.PENDING
                    ).exclude(order__status=Order.Status.CANCELLED).first()
                    if pending_item:
                        return Response({
                            "error": f"El asiento {seat.display_number} (Fila {seat.row_name}) se encuentra reservado en una orden pendiente."
                        }, status=status.HTTP_400_BAD_REQUEST)

                except Seat.DoesNotExist:
                    return Response({
                        "error": f"El asiento seleccionado no existe."
                    }, status=status.HTTP_400_BAD_REQUEST)

            if item.get('event_id') and not event_obj:
                from events.models import Event
                try:
                    event_obj = Event.objects.get(id=item['event_id'])
                except Event.DoesNotExist:
                    pass

            raffle_ticket = None
            if item.get('raffle_ticket_id'):
                from raffles.models import RaffleTicket
                try:
                    raffle_ticket = RaffleTicket.objects.get(id=item['raffle_ticket_id'], status=RaffleTicket.Status.AVAILABLE)
                    price = float(raffle_ticket.raffle.price)
                    name = f"{raffle_ticket.raffle.title} - Boleto #{raffle_ticket.number}"
                except RaffleTicket.DoesNotExist:
                    pass

            total_amount += price * qty
            order_items_data.append({'product': product, 'seat': seat, 'event': event_obj, 'raffle_ticket': raffle_ticket, 'product_name': name, 'quantity': qty, 'price': price, 'size': item.get('size', '')})
            mp_items.append({'title': name, 'quantity': qty, 'unit_price': price, 'currency_id': 'MXN'})

        shipping_cost = float(data.get('shipping_cost', 0))
        if shipping_cost > 0:
            total_amount += shipping_cost
            mp_items.append({'title': "Costo de Envío", 'quantity': 1, 'unit_price': shipping_cost, 'currency_id': 'MXN'})

        # Create Order record
        user = request.user if request.user.is_authenticated else None
        order = Order.objects.create(
            user=user,
            contact_email=contact_email,
            contact_phone=contact_phone,
            shipping_address=data.get('shipping_address', ''),
            shipping_city=data.get('shipping_city', ''),
            shipping_state=data.get('shipping_state', ''),
            shipping_zipcode=data.get('shipping_zipcode', ''),
            shipping_cost=shipping_cost,
            total_amount=total_amount,
            status=Order.Status.PENDING
        )
        for item_data in order_items_data:
            raffle_ticket = item_data.pop('raffle_ticket', None)
            order_item = OrderItem.objects.create(order=order, **item_data)
            if raffle_ticket:
                raffle_ticket.order_item = order_item
                raffle_ticket.save()

        # Process payment via MP Payments API
        try:
            config = get_active_config()
            access_token = config.mercadopago_access_token if config.mercadopago_access_token else settings.MERCADOPAGO_ACCESS_TOKEN
            if not access_token:
                raise Exception("No Mercado Pago Access Token configured.")
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
                    if item.product:
                        product = item.product
                        if product.is_clothing:
                            size = item.size
                            if size and isinstance(product.stock_by_size, dict) and size in product.stock_by_size:
                                product.stock_by_size[size] = max(0, product.stock_by_size[size] - item.quantity)
                                product.save(update_fields=['stock_by_size'])
                        else:
                            product.stock = max(0, product.stock - item.quantity)
                            product.save(update_fields=['stock'])

                # Process Raffle tickets
                for item in order.items.all():
                    if hasattr(item, 'raffle_tickets'):
                        from raffles.models import RaffleTicket
                        for rt in item.raffle_tickets.all():
                            rt.status = RaffleTicket.Status.SOLD_ONLINE
                            rt.buyer_name = order.user.get_full_name() if order.user else order.contact_email
                            rt.save()

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
                        if user.role not in ['ADMIN', 'SUPERADMIN', 'STAFF', 'REPORTER']:
                            user.role = 'PREMIUM'
                        user.save()
                        
                    try:
                        from premium.email_premium import send_premium_activation_email
                        send_premium_activation_email(subscription)
                    except Exception as mail_err:
                        print("Premium email error from verification:", mail_err)

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
                        enrollment.outstanding_balance = 0
                        enrollment.penalty_weeks_counted = 0
                        enrollment.save()
                        
                        # Automate WhatsApp
                        whatsapp_phone_number_id = config.whatsapp_phone_number_id
                        whatsapp_access_token = config.whatsapp_access_token
                        
                        import re
                        clean_phone = re.sub(r'\D', '', enrollment.phone)
                        if not clean_phone.startswith('52'):
                            clean_phone = '52' + clean_phone
                        
                        due_date_str = enrollment.payment_due_date.strftime('%d/%m/%Y')
                        last_payment_str = enrollment.last_payment_date.strftime('%d/%m/%Y')
                        whatsapp_message = (
                            f"🥊 *SCW Dojo — Confirmación de Mensualidad*\n\n"
                            f"¡Hola *{enrollment.name}*!\n\n"
                            f"Te confirmamos que hemos recibido con éxito el pago de tu mensualidad por Mercado Pago el día *{last_payment_str}*.\n\n"
                            f"📅 *Próximo Vencimiento:* {due_date_str}\n\n"
                            f"¡Muchas gracias por seguir entrenando en el SCW Dojo! ¡A seguir dándolo todo en el ring! 🥊⚡"
                        )
                        
                        if config.whatsapp_enabled and whatsapp_phone_number_id and whatsapp_access_token:
                            import requests
                            import logging
                            logger = logging.getLogger(__name__)
                            try:
                                url = f"https://graph.facebook.com/v19.0/{whatsapp_phone_number_id}/messages"
                                headers = {
                                    "Authorization": f"Bearer {whatsapp_access_token}",
                                    "Content-Type": "application/json"
                                }
                                payload = {
                                    "messaging_product": "whatsapp",
                                    "to": clean_phone,
                                    "type": "template",
                                    "template": {
                                        "name": "scw_pago_mensualidad",
                                        "language": {"code": "es_MX"},
                                        "components": [
                                            {
                                                "type": "body",
                                                "parameters": [
                                                    {"type": "text", "text": enrollment.name},
                                                    {"type": "text", "text": last_payment_str},
                                                    {"type": "text", "text": due_date_str}
                                                ]
                                            }
                                        ]
                                    }
                                }
                                res = requests.post(url, json=payload, headers=headers, timeout=8)
                                if res.status_code == 200:
                                    logger.info(f"WhatsApp de confirmación de colegiatura enviado a {enrollment.phone}")
                                else:
                                    logger.error(f"Error al enviar WhatsApp API: {res.text}")
                            except Exception as e:
                                logger.error(f"Error de conexión con WhatsApp API: {e}")

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
            has_tickets = order.items.filter(event__isnull=False).exists()
            has_merch = order.items.filter(product__isnull=False).exists()
            has_raffles = order.items.filter(raffle_tickets__isnull=False).exists()
            tickets_data = []
            for item in order.items.filter(event__isnull=False):
                if item.ticket_hash:
                    tickets_data.append({
                        "id": item.id,
                        "ticket_hash": item.ticket_hash,
                        "event_name": item.seat.zone.event.title if getattr(item, 'seat', None) and getattr(item.seat, 'zone', None) and getattr(item.seat.zone, 'event', None) else item.product_name,
                        "seat_name": str(item.seat) if getattr(item, 'seat', None) else None,
                        "price": str(item.price),
                        "buyer_name": getattr(item, 'buyer_name', None) or (order.user.get_full_name() if order.user else "") or order.contact_email
                    })
            return Response({
                "status": "approved", 
                "already_processed": True, 
                "order_id": order.id,
                "has_tickets": has_tickets,
                "has_merch": has_merch,
                "has_raffles": has_raffles,
                "tickets": tickets_data
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

                # Bloquear asientos y descontar inventario
                for item in order.items.all():
                    if getattr(item, 'seat', None) and item.seat.is_available:
                        item.seat.is_available = False
                        item.seat.save()
                    if item.product:
                        product = item.product
                        if product.is_clothing:
                            size = item.size
                            if size and isinstance(product.stock_by_size, dict) and size in product.stock_by_size:
                                product.stock_by_size[size] = max(0, product.stock_by_size[size] - item.quantity)
                                product.save(update_fields=['stock_by_size'])
                        else:
                            product.stock = max(0, product.stock - item.quantity)
                            product.save(update_fields=['stock'])

                # Process Raffle tickets
                for item in order.items.all():
                    if hasattr(item, 'raffle_tickets'):
                        from raffles.models import RaffleTicket
                        for rt in item.raffle_tickets.all():
                            rt.status = RaffleTicket.Status.SOLD_ONLINE
                            rt.buyer_name = order.user.get_full_name() if order.user else order.contact_email
                            rt.save()

                # Send ticket/merch email
                send_order_emails_safely(order)

                has_tickets = order.items.filter(event__isnull=False).exists()
                has_merch = order.items.filter(product__isnull=False).exists()
                has_raffles = order.items.filter(raffle_tickets__isnull=False).exists()
                tickets_data = []
                for item in order.items.filter(event__isnull=False):
                    if item.ticket_hash:
                        tickets_data.append({
                            "id": item.id,
                            "ticket_hash": item.ticket_hash,
                            "event_name": item.seat.zone.event.title if getattr(item, 'seat', None) and getattr(item.seat, 'zone', None) and getattr(item.seat.zone, 'event', None) else item.product_name,
                            "seat_name": str(item.seat) if getattr(item, 'seat', None) else None,
                            "price": str(item.price),
                            "buyer_name": getattr(item, 'buyer_name', None) or (order.user.get_full_name() if order.user else "") or order.contact_email
                        })

                return Response({
                    "status": "approved", 
                    "order_id": order.id,
                    "has_tickets": has_tickets,
                    "has_merch": has_merch,
                    "has_raffles": has_raffles,
                    "tickets": tickets_data
                })
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

        from .qr import validate_ticket_code, validate_group_ticket_code, group_order_items
        order_id = request.data.get('order_id')
        item_id = request.data.get('item_id')
        items_ids = request.data.get('items', [])
        code = request.data.get('code')

        if not order_id or not code or (not item_id and not items_ids):
            return Response({"valid": False, "message": "Datos incompletos."}, status=400)

        try:
            order = Order.objects.get(id=int(order_id))
        except Order.DoesNotExist:
            return Response({"valid": False, "message": "Orden no encontrada."}, status=404)

        if order.status != Order.Status.PAID:
            return Response({"valid": False, "message": "Esta orden no ha sido pagada."})

        # 1. Single item scan (primary flow for 1 QR per seat)
        if item_id and not items_ids:
            try:
                item = OrderItem.objects.get(id=int(item_id), order__id=int(order_id))
            except OrderItem.DoesNotExist:
                return Response({"valid": False, "message": "Boleto no encontrado."}, status=404)

            # Check single ticket code validation
            if not validate_ticket_code(int(order_id), int(item_id), code):
                # Fallback check if it was scanned with a group code
                if not validate_group_ticket_code(int(order_id), [int(item_id)], code):
                    return Response({"valid": False, "message": "❌ Código inválido."})

            if item.is_scanned:
                return Response({"valid": False, "message": "❌ Este boleto ya fue registrado/escaneado."})

            if item.event and item.event.date_time < timezone.now():
                return Response({"valid": False, "message": "❌ Evento caducado/pasado."})

            item.is_scanned = True
            item.scanned_at = timezone.now()
            item.save()

            seat_info = ""
            if item.seat and item.seat.zone:
                seat_info = f"{item.seat.zone.get_zone_type_display()} · Fila {item.seat.row_name} · Asiento {item.seat.display_number}"
            elif item.size:
                seat_info = item.size

            return Response({
                "valid": True,
                "message": "✅ Acceso autorizado",
                "item": item.product_name,
                "size": seat_info or item.size
            })

        # 2. Group items scan (fallback / legacy flow for group QRs)
        groups = group_order_items(order)
        target_group = None

        if items_ids:
            target_group = next((g for g in groups if set(g['item_ids']) == set(items_ids)), None)

        if target_group:
            if not validate_group_ticket_code(int(order_id), target_group['item_ids'], code):
                return Response({"valid": False, "message": "❌ Código de grupo inválido."})

            group_items = target_group['items']
            if all(it.is_scanned for it in group_items):
                return Response({"valid": False, "message": "❌ Este grupo de boletos ya fue registrado/escaneado."})

            # Check event expiry
            first_event = group_items[0].event
            if first_event and first_event.date_time < timezone.now():
                return Response({"valid": False, "message": "❌ Evento caducado/pasado."})

            now = timezone.now()
            for it in group_items:
                it.is_scanned = True
                it.scanned_at = now
                it.save()

            qty = target_group['quantity']
            return Response({
                "valid": True, 
                "message": f"✅ Acceso autorizado ({qty} boleto{'s' if qty > 1 else ''})", 
                "item": target_group['title'], 
                "size": target_group['subtitle']
            })

        return Response({"valid": False, "message": "Boleto o grupo no encontrado."}, status=404)



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
                                        if user.role not in ['ADMIN', 'SUPERADMIN', 'STAFF', 'REPORTER']:
                                            user.role = 'PREMIUM'
                                        user.save()
                                        
                                    try:
                                        from premium.email_premium import send_premium_activation_email
                                        send_premium_activation_email(subscription)
                                    except Exception as mail_err:
                                        print("Premium email error from webhook:", mail_err)
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
                                    enrollment.outstanding_balance = 0
                                    enrollment.penalty_weeks_counted = 0
                                    enrollment.save()

                                    whatsapp_phone_number_id = config.whatsapp_phone_number_id
                                    whatsapp_access_token = config.whatsapp_access_token
                                    
                                    import re
                                    clean_phone = re.sub(r'\D', '', enrollment.phone)
                                    if not clean_phone.startswith('52'):
                                        clean_phone = '52' + clean_phone
                                    
                                    due_date_str = enrollment.payment_due_date.strftime('%d/%m/%Y')
                                    last_payment_str = enrollment.last_payment_date.strftime('%d/%m/%Y')
                                    whatsapp_message = (
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

                                # Bloquear asientos y descontar inventario
                                for item in order.items.all():
                                    if getattr(item, 'seat', None) and item.seat.is_available:
                                        item.seat.is_available = False
                                        item.seat.save()
                                    if item.product:
                                        product = item.product
                                        if product.is_clothing:
                                            size = item.size
                                            if size and isinstance(product.stock_by_size, dict) and size in product.stock_by_size:
                                                product.stock_by_size[size] = max(0, product.stock_by_size[size] - item.quantity)
                                                product.save(update_fields=['stock_by_size'])
                                        else:
                                            product.stock = max(0, product.stock - item.quantity)
                                            product.save(update_fields=['stock'])

                                # Process Raffle tickets
                                for item in order.items.all():
                                    if hasattr(item, 'raffle_tickets'):
                                        from raffles.models import RaffleTicket
                                        for rt in item.raffle_tickets.all():
                                            rt.status = RaffleTicket.Status.SOLD_ONLINE
                                            rt.buyer_name = order.user.get_full_name() if order.user else order.contact_email
                                            rt.save()

                                send_order_emails_safely(order)
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
class TestEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            from django.core.mail import EmailMultiAlternatives, get_connection
            from django.conf import settings
            from api.models import get_active_config

            config = get_active_config()
            from_email = config.default_from_email if config.default_from_email else settings.DEFAULT_FROM_EMAIL
            
            # Use provided email or fallback to from_email
            test_target = request.query_params.get('email', from_email)

            connection = None
            if config.email_host_user and config.email_host_password:
                connection = get_connection(
                    host=config.email_host,
                    port=config.email_port,
                    username=config.email_host_user,
                    password=config.email_host_password,
                    use_tls=config.email_use_tls,
                )

            email = EmailMultiAlternatives(
                subject="Test SCW",
                body="Testing SMTP configuration.",
                from_email=from_email,
                to=[test_target]
            )
            email.connection = connection
            email.send(fail_silently=False)

            return Response({
                "status": "success",
                "message": f"Test email sent successfully to {test_target}",
                "config_used": {
                    "host": config.email_host,
                    "user": config.email_host_user,
                    "from_email": from_email
                }
            })
        except Exception as e:
            import traceback
            return Response({
                "status": "error",
                "error": str(e),
                "traceback": traceback.format_exc()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BoxOfficeEventsView(APIView):
    """Devuelve eventos y zonas con asientos disponibles para la app de escáner en modo Taquilla."""
    permission_classes = [AllowAny]

    def get(self, request):
        scanner_token = request.headers.get('X-Scanner-Token')
        expected_token = getattr(settings, 'SCANNER_TOKEN', 'scw-default-secret-token')
        if not (request.user.is_staff or scanner_token == expected_token):
            return Response({"error": "No autorizado."}, status=403)

        from events.models import Event
        from tickets.models import EventZone
        from django.utils import timezone
        
        events = Event.objects.filter(date_time__gte=timezone.now(), status__in=['SCHEDULED', 'LIVE'])
        data = []
        for event in events:
            zones_data = []
            for zone in event.zones.all():
                seats = zone.seats.all()
                available_seats = seats.filter(is_available=True).count()
                
                seats_data = []
                for s in seats:
                    seats_data.append({
                        "id": s.id,
                        "row": s.row_name,
                        "number": s.seat_number,
                        "is_available": s.is_available
                    })

                if available_seats > 0 or zone.zone_type == 'GENERAL':
                    zones_data.append({
                        "id": zone.id,
                        "name": zone.get_zone_type_display(),
                        "price": str(zone.price),
                        "available_seats": available_seats if zone.zone_type != 'GENERAL' else 999,
                        "seats": seats_data
                    })
            if zones_data:
                data.append({
                    "id": event.id,
                    "title": event.title,
                    "date": event.date_time.strftime('%Y-%m-%d %H:%M'),
                    "zones": zones_data
                })
        return Response(data)

class BoxOfficeSellView(APIView):
    """Vende un asiento específico en taquilla (pago en efectivo) y genera el QR."""
    permission_classes = [AllowAny]

    def post(self, request):
        scanner_token = request.headers.get('X-Scanner-Token')
        expected_token = getattr(settings, 'SCANNER_TOKEN', 'scw-default-secret-token')
        if not (request.user.is_staff or scanner_token == expected_token):
            return Response({"error": "No autorizado."}, status=403)

        event_id = request.data.get('event_id')
        seat_ids = request.data.get('seat_ids', [])
        zone_id = request.data.get('zone_id')
        quantity = request.data.get('quantity', 1)
        
        # Retrocompatibilidad
        seat_id = request.data.get('seat_id')
        if seat_id and not seat_ids:
            seat_ids = [seat_id]

        if not event_id:
            return Response({"error": "Falta event_id."}, status=400)
            
        if not seat_ids and not zone_id:
            return Response({"error": "Faltan datos de asiento o zona."}, status=400)

        from tickets.models import Seat, EventZone
        from payments.models import Order, OrderItem
        from payments.qr import get_ticket_hash
        from django.db import transaction

        try:
            with transaction.atomic():
                total_amount = 0
                items_data = []
                
                from events.models import Event
                event = Event.objects.get(id=event_id)
                
                if seat_ids:
                    seats = Seat.objects.select_for_update().filter(id__in=seat_ids, zone__event_id=event_id)
                    if len(seats) != len(seat_ids):
                        return Response({"error": "Algunos asientos son inválidos o no pertenecen a este evento."}, status=400)
                        
                    for seat in seats:
                        if not seat.is_available:
                            return Response({"error": f"El asiento {seat.display_number} ya no está disponible."}, status=400)
                        
                        seat.is_available = False
                        seat.save()
                        
                        total_amount += seat.zone.price
                        items_data.append({
                            'product_name': f"Boleto Taquilla - {seat}",
                            'price': seat.zone.price,
                            'event': seat.zone.event,
                            'seat': seat,
                            'seat_info': f"{seat.zone.get_zone_type_display()} - Fila {seat.row_name} Asiento {seat.display_number}",
                        })
                else:
                    zone = EventZone.objects.get(id=zone_id, event_id=event_id)
                    if zone.zone_type != 'GENERAL':
                        return Response({"error": "Debe proporcionar seat_ids para zonas numeradas."}, status=400)
                    
                    for _ in range(quantity):
                        total_amount += zone.price
                        items_data.append({
                            'product_name': f"Boleto Taquilla - General ({zone.event.title})",
                            'price': zone.price,
                            'event': zone.event,
                            'seat': None,
                            'seat_info': "GENERAL (Sin asiento asignado)"
                        })

                # Crear orden de venta en efectivo
                order = Order.objects.create(
                    user=request.user if request.user.is_authenticated else None,
                    contact_email="taquilla@scw.com",
                    total_amount=total_amount,
                    status=Order.Status.PAID,
                    payment_method='TRANSFER'
                )
                
                response_tickets = []
                for data in items_data:
                    item = OrderItem.objects.create(
                        order=order,
                        product_name=data['product_name'],
                        quantity=1,
                        price=data['price'],
                        event=data['event'],
                        seat=data['seat']
                    )
                    code = get_ticket_hash(order.id, item.id)
                    response_tickets.append({
                        "item_id": item.id,
                        "code": code,
                        "seat_info": data['seat_info'],
                        "price": str(data['price']),
                        "event_title": data['event'].title
                    })

            return Response({
                "success": True,
                "order_id": order.id,
                "tickets": response_tickets,
                "total": str(total_amount)
            })

        except Exception as e:
            return Response({"error": str(e)}, status=500)

class BoxOfficeRafflesView(APIView):
    """Devuelve rifas activas y sus boletos para la app de escáner en modo Taquilla."""
    permission_classes = [AllowAny]

    def get(self, request):
        scanner_token = request.headers.get('X-Scanner-Token')
        expected_token = getattr(settings, 'SCANNER_TOKEN', 'scw-default-secret-token')
        if not (request.user.is_staff or scanner_token == expected_token):
            return Response({"error": "No autorizado."}, status=403)

        from raffles.models import Raffle
        
        raffles = Raffle.objects.filter(is_active=True)
        data = []
        for raffle in raffles:
            tickets_data = []
            for ticket in raffle.tickets.all():
                tickets_data.append({
                    "id": ticket.id,
                    "number": ticket.number,
                    "status": ticket.status,
                    "buyer_name": ticket.buyer_name,
                })
            
            data.append({
                "id": raffle.id,
                "title": raffle.title,
                "price": str(raffle.price),
                "tickets": tickets_data
            })
        return Response(data)

class BoxOfficeSellRaffleView(APIView):
    """Vende un boleto de rifa en taquilla (pago en efectivo)."""
    permission_classes = [AllowAny]

    def post(self, request):
        scanner_token = request.headers.get('X-Scanner-Token')
        expected_token = getattr(settings, 'SCANNER_TOKEN', 'scw-default-secret-token')
        if not (request.user.is_staff or scanner_token == expected_token):
            return Response({"error": "No autorizado."}, status=403)

        ticket_id = request.data.get('ticket_id')
        buyer_name = request.data.get('buyer_name', '')
        buyer_phone = request.data.get('buyer_phone', '')

        if not ticket_id:
            return Response({"error": "Falta el ID del boleto."}, status=400)

        from raffles.models import RaffleTicket
        from django.db import transaction

        try:
            with transaction.atomic():
                ticket = RaffleTicket.objects.select_for_update().get(id=ticket_id)
                if ticket.status != RaffleTicket.Status.AVAILABLE:
                    return Response({"error": f"Este boleto ya está vendido ({ticket.status})."}, status=400)
                
                ticket.status = RaffleTicket.Status.SOLD_OFFLINE
                ticket.buyer_name = buyer_name
                ticket.buyer_phone = buyer_phone
                ticket.save()

            return Response({
                "success": True,
                "ticket_id": ticket.id,
                "number": ticket.number,
                "raffle_title": ticket.raffle.title,
                "price": str(ticket.raffle.price),
            })

        except RaffleTicket.DoesNotExist:
            return Response({"error": "Boleto inválido."}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class BoxOfficeDojoStudentView(APIView):
    """Devuelve el estado de un alumno del Dojo escaneado en Taquilla."""
    permission_classes = [AllowAny]

    def get(self, request, pk=None):
        scanner_token = request.headers.get('X-Scanner-Token')
        expected_token = getattr(settings, 'SCANNER_TOKEN', 'scw-default-secret-token')
        if not (request.user.is_staff or scanner_token == expected_token):
            return Response({"error": "No autorizado."}, status=403)

        from students.models import Enrollment
        try:
            enrollment = Enrollment.objects.get(id=pk, status='APPROVED')
            enrollment.update_dynamic_payment_status()
            return Response({
                "valid": True,
                "id": enrollment.id,
                "name": enrollment.name,
                "payment_status": enrollment.payment_status,
                "payment_due_date": enrollment.payment_due_date.strftime('%Y-%m-%d') if enrollment.payment_due_date else None,
                "outstanding_balance": str(enrollment.outstanding_balance)
            }, status=200)
        except Enrollment.DoesNotExist:
            return Response({"valid": False, "message": "Alumno no encontrado o no activo."}, status=404)

class BoxOfficeDojoPaymentView(APIView):
    """Registra el pago en efectivo o abono de un alumno del Dojo desde Taquilla."""
    permission_classes = [AllowAny]

    def post(self, request, pk=None):
        scanner_token = request.headers.get('X-Scanner-Token')
        expected_token = getattr(settings, 'SCANNER_TOKEN', 'scw-default-secret-token')
        if not (request.user.is_staff or scanner_token == expected_token):
            return Response({"error": "No autorizado."}, status=403)

        amount = request.data.get('amount')
        from students.models import Enrollment
        from decimal import Decimal
        from datetime import date, timedelta
        import requests

        try:
            enrollment = Enrollment.objects.get(id=pk, status='APPROVED')
            if amount is not None:
                amount = float(amount)
                if amount <= 0:
                    return Response({"error": "Monto debe ser mayor a 0"}, status=400)
                
                enrollment.outstanding_balance -= Decimal(str(amount))
                enrollment.last_payment_date = date.today()
                
                if enrollment.outstanding_balance <= 0:
                    if not enrollment.payment_due_date or enrollment.payment_due_date <= date.today():
                        enrollment.payment_due_date = date.today() + timedelta(days=30)
                    else:
                        enrollment.payment_due_date = enrollment.payment_due_date + timedelta(days=30)
                    enrollment.penalty_weeks_counted = 0
                    enrollment.payment_status = 'PAID'
                else:
                    enrollment.payment_status = 'UNPAID'
            else:
                enrollment.last_payment_date = date.today()
                if not enrollment.payment_due_date or enrollment.payment_due_date <= date.today():
                    enrollment.payment_due_date = date.today() + timedelta(days=30)
                else:
                    enrollment.payment_due_date = enrollment.payment_due_date + timedelta(days=30)
                enrollment.outstanding_balance = 0
                enrollment.penalty_weeks_counted = 0
                enrollment.payment_status = 'PAID'
                
            enrollment.save()

            whatsapp_sent = False
            try:
                config = get_active_config()
                if config.whatsapp_enabled and config.whatsapp_phone_number_id and config.whatsapp_access_token:
                    # Formato de número: debe incluir código de país, usualmente 52 para México sin el 1 extra.
                    phone_str = str(enrollment.phone)
                    if not phone_str.startswith('52'):
                        phone_str = '52' + phone_str
                        
                    due_date_str = enrollment.payment_due_date.strftime('%d/%m/%Y')
                    last_payment_str = enrollment.last_payment_date.strftime('%d/%m/%Y')
                    
                    msg = (
                        f"🥊 *SCW Dojo — Pago en Taquilla*\n\n"
                        f"¡Hola *{enrollment.name}*!\n\n"
                        f"Hemos recibido tu pago en efectivo por ${amount if amount else 'completo'} el día *{last_payment_str}*.\n\n"
                        f"📅 *Próximo Vencimiento:* {due_date_str}\n"
                        f"💰 *Saldo Restante:* ${enrollment.outstanding_balance}\n\n"
                        f"¡Gracias por seguir entrenando en el SCW Dojo! 🥊⚡"
                    )

                    headers = {
                        "Authorization": f"Bearer {config.whatsapp_access_token}",
                        "Content-Type": "application/json"
                    }
                    
                    # Intentamos enviar como mensaje de texto libre (Solo funcionará si el usuario escribió en las últimas 24 hrs)
                    # NOTA: Para mensajes en frío, deberás cambiar "type": "text" por "type": "template" y usar una plantilla aprobada.
                    payload = {
                        "messaging_product": "whatsapp",
                        "to": phone_str,
                        "type": "text",
                        "text": {
                            "body": msg
                        }
                    }
                    
                    meta_url = f"https://graph.facebook.com/v19.0/{config.whatsapp_phone_number_id}/messages"
                    response = requests.post(meta_url, headers=headers, json=payload, timeout=10)
                    
                    if response.status_code == 200:
                        whatsapp_sent = True
                    else:
                        print("Error Meta API:", response.text)
            except Exception as e:
                print("Exception WhatsApp:", str(e))

            return Response({
                "success": True, 
                "message": "Pago registrado correctamente",
                "whatsapp_sent": whatsapp_sent
            })
            
        except Enrollment.DoesNotExist:
            return Response({"error": "Alumno no encontrado."}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class GenerateCourtesyTicketView(APIView):
    """Genera boletos de cortesía o emisión directa de boletos (ventas) y los envía por correo con QR."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        event_id = request.data.get('event_id')
        seat_ids = request.data.get('seat_ids', [])
        if 'seat_id' in request.data and not seat_ids:
            seat_ids = [request.data.get('seat_id')]
            
        quantity_general = int(request.data.get('quantity_general', 0))
        email = request.data.get('email')
        raw_name = request.data.get('name', '')
        
        is_courtesy = request.data.get('is_courtesy', True)
        payment_method = request.data.get('payment_method', 'COURTESY' if is_courtesy else 'TRANSFER')

        if not event_id or not email:
            return Response({"error": "Faltan datos de evento o correo."}, status=400)
            
        if not seat_ids and quantity_general <= 0:
            return Response({"error": "Debes seleccionar asientos o indicar cantidad general."}, status=400)

        from tickets.models import Seat, EventZone
        from events.models import Event
        from django.db import transaction
        from decimal import Decimal

        try:
            with transaction.atomic():
                event = Event.objects.get(id=event_id)
                general_zone = None
                if quantity_general > 0:
                    general_zone = EventZone.objects.filter(event=event, zone_type='GENERAL').first()

                total_amount = Decimal('0.00')
                items_to_create = []

                if seat_ids:
                    seats = Seat.objects.select_for_update().filter(id__in=seat_ids, zone__event_id=event_id)
                    if len(seats) != len(seat_ids):
                        return Response({"error": "Algunos asientos no son válidos para este evento."}, status=400)
                    
                    for seat in seats:
                        if not seat.is_available:
                            return Response({"error": f"El asiento {seat.display_number} ya no está disponible."}, status=400)
                        
                        price = Decimal('0.00') if is_courtesy else Decimal(str(seat.zone.price))
                        total_amount += price
                        prefix = "Boleto CORTESÍA" if is_courtesy else "Boleto"
                        p_name = f"{prefix}: {seat.zone.zone_type} - Fila {seat.row_name} Asiento {seat.display_number}"

                        items_to_create.append({
                            'product_name': p_name,
                            'quantity': 1,
                            'price': price,
                            'event': event,
                            'seat': seat,
                            'size': f"Fila {seat.row_name} - Asiento {seat.display_number}"
                        })

                if quantity_general > 0:
                    gen_price = Decimal('0.00') if is_courtesy else (Decimal(str(general_zone.price)) if general_zone else Decimal('0.00'))
                    prefix = "Boleto CORTESÍA" if is_courtesy else "Boleto"
                    for _ in range(quantity_general):
                        total_amount += gen_price
                        items_to_create.append({
                            'product_name': f"{prefix}: GENERAL",
                            'quantity': 1,
                            'price': gen_price,
                            'event': event,
                            'seat': None,
                            'size': 'General'
                        })

                contact_name = raw_name.strip() if raw_name.strip() else ("Cortesía SCW" if is_courtesy else "Cliente SCW")

                # Crear orden pagada
                order = Order.objects.create(
                    user=request.user if request.user.is_authenticated else None,
                    contact_email=email,
                    contact_name=contact_name,
                    total_amount=total_amount,
                    status=Order.Status.PAID,
                    payment_method=payment_method
                )

                for item_data in items_to_create:
                    if item_data['seat']:
                        item_data['seat'].is_available = False
                        item_data['seat'].save()

                    OrderItem.objects.create(
                        order=order,
                        product_name=item_data['product_name'],
                        quantity=item_data['quantity'],
                        price=item_data['price'],
                        event=item_data['event'],
                        seat=item_data['seat'],
                        size=item_data['size']
                    )
                
            # Fuera de la transacción enviamos el correo
            send_order_emails_safely(order)
            msg = "Boletos de cortesía generados y enviados." if is_courtesy else "Boletos emitidos y enviados correctamente."
            return Response({"success": True, "message": msg, "order_id": order.id})
            
        except Event.DoesNotExist:
            return Response({"error": "Evento no encontrado."}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
