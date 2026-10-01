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
                if zone.get('price_abono'):
                    zone['price_abono'] = str(round(float(zone['price_abono']) * (1 + commission), 2))
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

    @action(detail=False, methods=['post'])
    def update_map_config(self, request):
        event_id = request.data.get('event_id')
        map_config = request.data.get('map_config')
        map_type = request.data.get('map_type')
        from events.models import Event
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({"error": "Evento no encontrado"}, status=404)
        
        if map_config is not None:
            event.map_config = map_config
        if map_type is not None:
            event.map_type = map_type
        event.save(update_fields=['map_config', 'map_type'])
        return Response({"status": "success", "map_type": event.map_type, "map_config": event.map_config})

    @action(detail=False, methods=['post'])
    def apply_template(self, request):
        event_id = request.data.get('event_id')
        template_type = request.data.get('template_type', 'ARENA_VIP')
        prices = request.data.get('prices', {})
        clear_existing = request.data.get('clear_existing', True)

        from events.models import Event
        from django.db import transaction
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({"error": "Evento no encontrado"}, status=404)

        with transaction.atomic():
            if clear_existing:
                EventZone.objects.filter(event=event).delete()

            if template_type == 'ARENA_VIP':
                event.map_type = 'ARENA_VIP'
                event.map_config = {
                    "width": 1200,
                    "height": 980,
                    "ring": { "x": 340, "y": 300, "width": 360, "height": 360, "title": "RING SCW" },
                    "general_areas": [
                        { "id": "gen_top", "title": "GENERAL", "x": 270, "y": 40, "width": 300, "height": 140 },
                        { "id": "gen_right", "title": "GENERAL", "x": 840, "y": 190, "width": 330, "height": 600 },
                        { "id": "gen_bottom", "title": "GENERAL", "x": 270, "y": 790, "width": 570, "height": 90 }
                    ],
                    "aisles": [
                        { "id": "pasillo_top", "title": "PASILLO", "x": 490, "y": 200, "width": 60, "height": 90 }
                    ],
                    "entrance": { "x": 185, "y": 780, "title": "ENTRADA" }
                }
                event.save(update_fields=['map_type', 'map_config'])

                # 1. Mesas VIP Ringside (8 Mesas)
                z_ringside = EventZone.objects.create(
                    event=event,
                    zone_type=EventZone.ZoneType.MESAS_VIP_RINGSIDE,
                    name='Mesas VIP Ringside',
                    color='#d946ef',
                    price=prices.get('MESAS_VIP_RINGSIDE', '1500.00'),
                    price_abono=prices.get('MESAS_VIP_RINGSIDE_ABONO', None),
                    rows=8,
                    seats_per_row=1
                )
                for t in range(1, 9):
                    Seat.objects.create(
                        zone=z_ringside,
                        row_name='RINGSIDE',
                        seat_number=t,
                        table_number=t,
                        custom_label=str(t),
                        x=185.0,
                        y=210.0 + (t * 62.0),
                        is_available=True
                    )

                # 2. Mesas VIP (12 Mesas en 2 filas de 6)
                z_vip = EventZone.objects.create(
                    event=event,
                    zone_type=EventZone.ZoneType.MESAS_VIP,
                    name='Mesas VIP',
                    color='#eab308',
                    price=prices.get('MESAS_VIP', '1000.00'),
                    price_abono=prices.get('MESAS_VIP_ABONO', None),
                    rows=2,
                    seats_per_row=6
                )
                xs_vip = [635.0, 705.0, 775.0, 845.0, 915.0, 985.0]
                for idx, x_pos in enumerate(xs_vip):
                    t = idx + 1
                    Seat.objects.create(
                        zone=z_vip,
                        row_name='VIP 1',
                        seat_number=t,
                        table_number=t,
                        custom_label=str(t),
                        x=x_pos,
                        y=70.0,
                        is_available=True
                    )
                for idx, x_pos in enumerate(xs_vip):
                    t = idx + 7
                    Seat.objects.create(
                        zone=z_vip,
                        row_name='VIP 2',
                        seat_number=t,
                        table_number=t,
                        custom_label=str(t),
                        x=x_pos,
                        y=138.0,
                        is_available=True
                    )

                # 3. Primera Fila (44 Asientos Rojos)
                z_f1 = EventZone.objects.create(
                    event=event,
                    zone_type=EventZone.ZoneType.PRIMERA_FILA,
                    name='Primera Fila',
                    color='#ef4444',
                    price=prices.get('PRIMERA_FILA', '500.00'),
                    price_abono=prices.get('PRIMERA_FILA_ABONO', None),
                    rows=1,
                    seats_per_row=44
                )

                # 4. Segunda Fila (44 Asientos Azules)
                z_f2 = EventZone.objects.create(
                    event=event,
                    zone_type=EventZone.ZoneType.SEGUNDA_FILA,
                    name='Segunda Fila',
                    color='#2563eb',
                    price=prices.get('SEGUNDA_FILA', '400.00'),
                    price_abono=prices.get('SEGUNDA_FILA_ABONO', None),
                    rows=1,
                    seats_per_row=44
                )

                # Top - Izquierda de Pasillo: 1 a 6
                top_left_xs = [335.0, 360.0, 385.0, 410.0, 435.0, 460.0]
                for i, x_pos in enumerate(top_left_xs):
                    s_num = i + 1
                    Seat.objects.create(zone=z_f1, row_name='NORTE', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=205.0)
                    Seat.objects.create(zone=z_f2, row_name='NORTE', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=242.0)

                # Top - Derecha de Pasillo: 7 a 12
                top_right_xs = [580.0, 605.0, 630.0, 655.0, 680.0, 705.0]
                for i, x_pos in enumerate(top_right_xs):
                    s_num = i + 7
                    Seat.objects.create(zone=z_f1, row_name='NORTE', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=205.0)
                    Seat.objects.create(zone=z_f2, row_name='NORTE', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=242.0)

                # Derecha: 13 a 28 (vertical)
                for i in range(16):
                    s_num = 13 + i
                    y_pos = 260.0 + (i * 29.0)
                    Seat.objects.create(zone=z_f1, row_name='ESTE', seat_number=s_num, custom_label=str(s_num), x=748.0, y=y_pos)
                    Seat.objects.create(zone=z_f2, row_name='ESTE', seat_number=s_num, custom_label=str(s_num), x=785.0, y=y_pos)

                # Abajo: 44 a 29 (de izquierda a derecha: 44, 43, 42 ... 29)
                for i in range(16):
                    s_num = 44 - i
                    x_pos = 320.0 + (i * 27.5)
                    Seat.objects.create(zone=z_f1, row_name='SUR', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=715.0)
                    Seat.objects.create(zone=z_f2, row_name='SUR', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=752.0)

                # 5. Zona General (Sin numeración)
                EventZone.objects.create(
                    event=event,
                    zone_type=EventZone.ZoneType.GENERAL,
                    name='General',
                    color='#064e3b',
                    price=prices.get('GENERAL', '250.00'),
                    price_abono=prices.get('GENERAL_ABONO', None),
                    rows=0,
                    seats_per_row=0
                )

            elif template_type == 'CLASSIC_RING':
                event.map_type = 'CLASSIC_RING'
                event.map_config = {}
                event.save(update_fields=['map_type', 'map_config'])

                for zt, rows, sps, pr in [
                    (EventZone.ZoneType.NORTE, 2, 17, prices.get('NORTE', '320.00')),
                    (EventZone.ZoneType.SUR, 2, 17, prices.get('SUR', '320.00')),
                    (EventZone.ZoneType.ESTE, 2, 10, prices.get('ESTE', '320.00')),
                    (EventZone.ZoneType.OESTE, 2, 16, prices.get('OESTE', '320.00')),
                    (EventZone.ZoneType.GENERAL, 0, 0, prices.get('GENERAL', '200.00')),
                ]:
                    EventZone.objects.create(
                        event=event,
                        zone_type=zt,
                        name=dict(EventZone.ZoneType.choices).get(zt, zt),
                        price=pr,
                        rows=rows,
                        seats_per_row=sps
                    )

        serializer = self.get_serializer(event.zones.all(), many=True)
        return Response({
            "status": "success",
            "map_type": event.map_type,
            "map_config": event.map_config,
            "zones": serializer.data
        })

class SeatViewSet(viewsets.ModelViewSet):
    queryset = Seat.objects.all()
    serializer_class = SeatSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=False, methods=['post'])
    def bulk_update_positions(self, request):
        seats_data = request.data.get('seats', [])
        if not isinstance(seats_data, list):
            return Response({"error": "seats debe ser una lista"}, status=400)

        seat_ids = [s.get('id') for s in seats_data if s.get('id')]
        seats_by_id = {s.id: s for s in Seat.objects.filter(id__in=seat_ids)}

        updated_seats = []
        for s_data in seats_data:
            s_id = s_data.get('id')
            if s_id in seats_by_id:
                seat = seats_by_id[s_id]
                if 'x' in s_data: seat.x = s_data['x']
                if 'y' in s_data: seat.y = s_data['y']
                if 'custom_label' in s_data: seat.custom_label = s_data['custom_label']
                if 'row_name' in s_data: seat.row_name = s_data['row_name']
                if 'seat_number' in s_data: seat.seat_number = s_data['seat_number']
                if 'table_number' in s_data: seat.table_number = s_data['table_number']
                if 'table_seat_number' in s_data: seat.table_seat_number = s_data['table_seat_number']
                if 'is_available' in s_data: seat.is_available = s_data['is_available']
                if 'zone_id' in s_data and s_data['zone_id']: seat.zone_id = s_data['zone_id']
                updated_seats.append(seat)

        if updated_seats:
            Seat.objects.bulk_update(
                updated_seats,
                ['x', 'y', 'custom_label', 'row_name', 'seat_number', 'table_number', 'table_seat_number', 'is_available', 'zone']
            )

        return Response({"status": "success", "updated_count": len(updated_seats)})

    @action(detail=False, methods=['post'])
    def create_custom_seat(self, request):
        zone_id = request.data.get('zone_id')
        if not zone_id:
            return Response({"error": "zone_id requerido"}, status=400)
        try:
            zone = EventZone.objects.get(id=zone_id)
        except EventZone.DoesNotExist:
            return Response({"error": "Zona no encontrada"}, status=404)

        row_name = request.data.get('row_name', 'A')
        seat_number = request.data.get('seat_number', 1)
        x = request.data.get('x')
        y = request.data.get('y')
        custom_label = request.data.get('custom_label', str(seat_number))
        table_number = request.data.get('table_number')
        table_seat_number = request.data.get('table_seat_number')
        is_available = request.data.get('is_available', True)

        while Seat.objects.filter(zone=zone, row_name=row_name, seat_number=seat_number).exists():
            seat_number += 1

        seat = Seat.objects.create(
            zone=zone,
            row_name=row_name,
            seat_number=seat_number,
            x=x,
            y=y,
            custom_label=custom_label,
            table_number=table_number,
            table_seat_number=table_seat_number,
            is_available=is_available
        )
        return Response(SeatSerializer(seat).data)

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
