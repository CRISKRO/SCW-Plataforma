from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, BasePermission, SAFE_METHODS
from .models import EventZone, Seat
from .serializers import EventZoneSerializer, SeatSerializer
from rest_framework.decorators import action
from rest_framework.response import Response

class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or getattr(request.user, 'role', None) in ['ADMIN', 'SUPERADMIN'])
        )

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)

class EventZoneViewSet(viewsets.ModelViewSet):
    queryset = EventZone.objects.all()
    serializer_class = EventZoneSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=False, methods=['get'])
    def by_event(self, request):
        event_id = request.query_params.get('event_id')
        requested_day = request.query_params.get('day', 'ALL')
        if event_id:
            zones = self.queryset.filter(event_id=event_id).prefetch_related('seats')
            serializer = self.get_serializer(zones, many=True)
            data = [dict(zone) for zone in serializer.data]
            
            from api.models import get_active_config
            from payments.models import Order, OrderItem
            from django.utils import timezone
            from datetime import timedelta

            config = get_active_config()
            commission = float(config.mercadopago_commission_rate)
            now = timezone.now()
            
            # Obtener ventas pagadas de este evento agrupadas por asiento y valid_for_day
            paid_items = OrderItem.objects.filter(
                order__status=Order.Status.PAID,
                seat__zone__event_id=event_id
            ).values('seat_id', 'valid_for_day')

            occupied_by_seat = {}
            for item in paid_items:
                s_id = item['seat_id']
                if s_id not in occupied_by_seat:
                    occupied_by_seat[s_id] = set()
                occupied_by_seat[s_id].add(item['valid_for_day'])
            
            seats_by_id = {s.id: s for z in zones for s in z.seats.all()}

            for zone in data:
                zone['price'] = str(round(float(zone['price']) * (1 + commission), 2))
                for seat_data in zone.get('seats', []):
                    s_id = seat_data['id']
                    seat_obj = seats_by_id.get(s_id)

                    occupied_days = occupied_by_seat.get(s_id, set())
                    is_sold_for_day = False
                    if 'ALL' in occupied_days or 'BOTH' in occupied_days:
                        is_sold_for_day = True
                    elif requested_day == 'DAY_1' and ('DAY_1' in occupied_days or 'BOTH' in occupied_days or 'ALL' in occupied_days):
                        is_sold_for_day = True
                    elif requested_day == 'DAY_2' and ('DAY_2' in occupied_days or 'BOTH' in occupied_days or 'ALL' in occupied_days):
                        is_sold_for_day = True
                    elif requested_day == 'BOTH' and len(occupied_days) > 0:
                        is_sold_for_day = True

                    is_temp_locked = False
                    if seat_obj and seat_obj.locked_at and now < seat_obj.locked_at + timedelta(minutes=10):
                        lock_info = seat_obj.locked_by_session or ""
                        if "::" in lock_info:
                            _, lock_day = lock_info.split("::", 1)
                        else:
                            lock_day = 'ALL'

                        if lock_day in ['ALL', 'BOTH']:
                            is_temp_locked = True
                        elif requested_day == 'DAY_1' and lock_day == 'DAY_1':
                            is_temp_locked = True
                        elif requested_day == 'DAY_2' and lock_day == 'DAY_2':
                            is_temp_locked = True
                        elif requested_day == 'BOTH':
                            is_temp_locked = True

                    is_disabled = not seat_data.get('is_available', True)
                    seat_data['is_locked'] = bool(is_sold_for_day or is_temp_locked or is_disabled)

            return Response(data)
        return Response([])

class SeatViewSet(viewsets.ModelViewSet):
    queryset = Seat.objects.all()
    serializer_class = SeatSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def lock_seats(self, request):
        seat_ids = request.data.get('seat_ids', [])
        session_id = request.data.get('session_id')
        requested_day = request.data.get('day', 'ALL')
        
        if not seat_ids or not session_id:
            return Response({"error": "seat_ids y session_id son requeridos"}, status=400)
            
        from django.utils import timezone
        from datetime import timedelta
        from payments.models import Order, OrderItem
        
        # Verify no seat is already locked by someone else or sold
        seats = Seat.objects.filter(id__in=seat_ids)
        if len(seats) != len(seat_ids):
            return Response({"error": "Algunos asientos no existen"}, status=404)
            
        for seat in seats:
            if not seat.is_available:
                return Response({"error": f"El asiento {seat.seat_number} de la fila {seat.row_name} no está disponible."}, status=400)

            paid_items = OrderItem.objects.filter(
                seat=seat,
                order__status=Order.Status.PAID
            ).values_list('valid_for_day', flat=True)

            occupied_days = set(paid_items)
            is_sold = False
            if 'ALL' in occupied_days or 'BOTH' in occupied_days:
                is_sold = True
            elif requested_day == 'DAY_1' and ('DAY_1' in occupied_days or 'BOTH' in occupied_days or 'ALL' in occupied_days):
                is_sold = True
            elif requested_day == 'DAY_2' and ('DAY_2' in occupied_days or 'BOTH' in occupied_days or 'ALL' in occupied_days):
                is_sold = True
            elif requested_day == 'BOTH' and len(occupied_days) > 0:
                is_sold = True

            if is_sold:
                return Response({"error": f"El asiento {seat.seat_number} de la fila {seat.row_name} ya fue vendido para el día seleccionado."}, status=400)

            if seat.locked_at and timezone.now() < seat.locked_at + timedelta(minutes=10):
                lock_info = seat.locked_by_session or ""
                if "::" in lock_info:
                    lock_sess, lock_day = lock_info.split("::", 1)
                else:
                    lock_sess, lock_day = lock_info, 'ALL'

                is_conflicting_lock = False
                if lock_day in ['ALL', 'BOTH']:
                    is_conflicting_lock = True
                elif requested_day == 'DAY_1' and lock_day == 'DAY_1':
                    is_conflicting_lock = True
                elif requested_day == 'DAY_2' and lock_day == 'DAY_2':
                    is_conflicting_lock = True
                elif requested_day == 'BOTH':
                    is_conflicting_lock = True

                if is_conflicting_lock and lock_sess != session_id:
                    return Response({"error": f"El asiento {seat.seat_number} de la fila {seat.row_name} está reservado temporalmente por otro usuario."}, status=400)
                    
        # Lock them with session and day
        now = timezone.now()
        for seat in seats:
            seat.locked_at = now
            seat.locked_by_session = f"{session_id}::{requested_day}"
            seat.save(update_fields=['locked_at', 'locked_by_session'])
            
        return Response({"status": "locked"})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def unlock_seats(self, request):
        seat_ids = request.data.get('seat_ids', [])
        session_id = request.data.get('session_id')
        
        if not seat_ids or not session_id:
            return Response({"error": "seat_ids y session_id son requeridos"}, status=400)
            
        seats = Seat.objects.filter(id__in=seat_ids)
        for seat in seats:
            if seat.locked_by_session and (seat.locked_by_session == session_id or seat.locked_by_session.startswith(f"{session_id}::")):
                seat.locked_at = None
                seat.locked_by_session = None
                seat.save(update_fields=['locked_at', 'locked_by_session'])
                
        return Response({"status": "unlocked"})
