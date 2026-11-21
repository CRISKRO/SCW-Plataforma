from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, BasePermission, SAFE_METHODS
from .models import EventZone, Seat
from .serializers import EventZoneSerializer, SeatSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from .locking import (
    SEAT_HOLD_TTL, MAX_SEATS_PER_SESSION, MAX_SEATS_PER_IP,
    VALID_DAYS, SESSION_ID_PATTERN, client_fingerprint,
    lock_owner, owned_by_request,
)

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

                    # Un registro Seat sólo admite un hold activo a la vez.
                    # Mostrarlo ocupado en todos los días evita vender dos veces
                    # durante esta ventana breve.
                    is_temp_locked = bool(
                        seat_obj and seat_obj.locked_at
                        and now < seat_obj.locked_at + SEAT_HOLD_TTL
                    )

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

        def get_price(key, default):
            val = prices.get(key)
            if val is None or str(val).strip() == '':
                return default
            try:
                float(val)
                return str(val)
            except (ValueError, TypeError):
                return default

        if clear_existing:
            # Candado: regenerar el mapa borra los asientos y libera los boletos ya vendidos.
            from payments.models import Order, OrderItem
            sold = OrderItem.objects.filter(
                seat__zone__event=event
            ).exclude(order__status=Order.Status.CANCELLED).count()
            if sold:
                return Response({
                    "error": f"Este evento ya tiene {sold} boleto(s) ligados a asientos. "
                             "No se puede regenerar el mapa porque se liberarían esos asientos."
                }, status=400)

        with transaction.atomic():
            if clear_existing:
                EventZone.objects.filter(event=event).delete()

            if template_type in ['ARENA_VIP', 'LABRU']:
                event.map_type = 'ARENA_VIP'
                if not event.location or event.location in ['Labrú', 'The Wrestling Factory', 'Arena Metropolitana SCW', 'Gimnasio Municipal SCW', '']:
                    event.location = 'Labrú'
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
                event.save(update_fields=['map_type', 'map_config', 'location'])

                # 1. Mesas VIP Ringside (8 Mesas)
                z_ringside = EventZone.objects.create(
                    event=event,
                    zone_type=EventZone.ZoneType.MESAS_VIP_RINGSIDE,
                    name='Mesas VIP Ringside',
                    color='#d946ef',
                    price=get_price('MESAS_VIP_RINGSIDE', '1500.00'),
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
                    price=get_price('MESAS_VIP', '1000.00'),
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
                    price=get_price('PRIMERA_FILA', '500.00'),
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
                    price=get_price('SEGUNDA_FILA', '400.00'),
                    price_abono=prices.get('SEGUNDA_FILA_ABONO', None),
                    rows=1,
                    seats_per_row=44
                )

                # Top - Izquierda de Pasillo: 1 a 6
                top_left_xs = [335.0, 360.0, 385.0, 410.0, 435.0, 460.0]
                for i, x_pos in enumerate(top_left_xs):
                    s_num = i + 1
                    Seat.objects.create(zone=z_f1, row_name='NORTE', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=242.0)
                    Seat.objects.create(zone=z_f2, row_name='NORTE', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=205.0)

                # Top - Derecha de Pasillo: 7 a 12
                top_right_xs = [580.0, 605.0, 630.0, 655.0, 680.0, 705.0]
                for i, x_pos in enumerate(top_right_xs):
                    s_num = i + 7
                    Seat.objects.create(zone=z_f1, row_name='NORTE', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=242.0)
                    Seat.objects.create(zone=z_f2, row_name='NORTE', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=205.0)

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
                    price=get_price('GENERAL', '250.00'),
                    price_abono=prices.get('GENERAL_ABONO', None),
                    rows=0,
                    seats_per_row=0
                )

            elif template_type in ['CLASSIC_RING', 'WRESTLING_FACTORY']:
                event.map_type = 'CLASSIC_RING'
                if not event.location or event.location in ['Labrú', 'The Wrestling Factory', 'Arena Metropolitana SCW', 'Gimnasio Municipal SCW', '']:
                    event.location = 'The Wrestling Factory'
                event.map_config = {}
                event.save(update_fields=['map_type', 'map_config', 'location'])

                for zt, rows, sps, pr_key, def_price in [
                    (EventZone.ZoneType.NORTE, 2, 17, 'NORTE', '320.00'),
                    (EventZone.ZoneType.SUR, 2, 17, 'SUR', '320.00'),
                    (EventZone.ZoneType.ESTE, 2, 10, 'ESTE', '320.00'),
                    (EventZone.ZoneType.OESTE, 2, 16, 'OESTE', '320.00'),
                    (EventZone.ZoneType.GENERAL, 0, 0, 'GENERAL', '200.00'),
                ]:
                    EventZone.objects.create(
                        event=event,
                        zone_type=zt,
                        name=dict(EventZone.ZoneType.choices).get(zt, zt),
                        price=get_price(pr_key, def_price),
                        rows=rows,
                        seats_per_row=sps
                    )

        serializer = self.get_serializer(event.zones.all(), many=True)
        return Response({
            "status": "success",
            "map_type": event.map_type,
            "location": event.location,
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
        session_id = request.data.get('session_id')
        seat_ids = request.data.get('seat_ids')
        requested_day = request.data.get('day', 'ALL')

        if not isinstance(session_id, str) or not SESSION_ID_PATTERN.fullmatch(session_id):
            return Response({"error": "Sesión de reserva inválida."}, status=400)
        if requested_day not in VALID_DAYS:
            return Response({"error": "Día seleccionado inválido."}, status=400)
        if not isinstance(seat_ids, list) or not 1 <= len(seat_ids) <= MAX_SEATS_PER_SESSION:
            return Response({"error": "Máximo 6 asientos por compra."}, status=400)
        # No permitir duplicados, booleanos ni ids arbitrarios.
        if any(type(seat_id) is not int or seat_id <= 0 for seat_id in seat_ids):
            return Response({"error": "Identificadores de asientos inválidos."}, status=400)
        if len(set(seat_ids)) != len(seat_ids):
            return Response({"error": "Asientos duplicados."}, status=400)

        # La fila del evento serializa las reservas del mismo mapa, incluso
        # cuando el atacante cambia de sesión o envía requests simultáneas.
        from events.models import Event
        from payments.models import Order, OrderItem

        now = timezone.now()
        cutoff = now - SEAT_HOLD_TTL
        owner = lock_owner(session_id, request)
        fingerprint = client_fingerprint(request)

        with transaction.atomic():
            event_ids = set(Seat.objects.filter(id__in=seat_ids).values_list(
                'zone__event_id', flat=True
            ))
            if len(event_ids) != 1:
                return Response({"error": "Los asientos deben pertenecer al mismo evento."}, status=400)
            event_id = next(iter(event_ids))
            Event.objects.select_for_update().get(pk=event_id)
            seats = list(Seat.objects.select_for_update().filter(
                id__in=seat_ids
            ).order_by('id'))
            if len(seats) != len(seat_ids):
                return Response({"error": "Algunos asientos no existen."}, status=404)

            active_locks = Seat.objects.filter(
                zone__event_id=event_id, locked_at__gt=cutoff
            )
            own_locks = active_locks.filter(
                Q(locked_by_session__startswith=f"{owner}::")
                | Q(locked_by_session__startswith=f"{session_id}::")
            )
            already_own_ids = set(own_locks.values_list('id', flat=True))
            if len(already_own_ids | set(seat_ids)) > MAX_SEATS_PER_SESSION:
                return Response({"error": "Ya tienes el máximo de 6 asientos reservados."}, status=429)

            ip_hold_ids = set(active_locks.filter(
                locked_by_session__contains=f"~{fingerprint}::"
            ).values_list('id', flat=True))
            new_hold_ids = set(seat_ids) - already_own_ids
            if len(ip_hold_ids | new_hold_ids) > MAX_SEATS_PER_IP:
                return Response({
                    "error": "Demasiados asientos reservados desde esta conexión. Intenta más tarde."
                }, status=429)

            for seat in seats:
                if not seat.is_available:
                    return Response({"error": f"El asiento {seat.seat_number} ya fue vendido."}, status=409)

                occupied_days = set(OrderItem.objects.filter(
                    seat=seat, order__status=Order.Status.PAID
                ).values_list('valid_for_day', flat=True))
                is_sold = (
                    bool(occupied_days & {"ALL", "BOTH"})
                    or requested_day in {"ALL", "BOTH"} and bool(occupied_days)
                    or requested_day in occupied_days
                )
                if is_sold:
                    return Response({"error": f"El asiento {seat.seat_number} ya fue vendido."}, status=409)

                # Una orden iniciada debe conservar su oportunidad de pagar;
                # no liberar ni sobrescribir pagos legítimos en curso.
                pending_cutoff = now - timedelta(minutes=15)
                pending_days = set(OrderItem.objects.filter(
                    seat=seat,
                    order__status=Order.Status.PENDING,
                    order__created_at__gte=pending_cutoff,
                ).values_list('valid_for_day', flat=True))
                if pending_days & {"ALL", "BOTH"} or (
                    requested_day in {"ALL", "BOTH"} and pending_days
                ) or requested_day in pending_days:
                    return Response({
                        "error": f"El asiento {seat.seat_number} está en una compra pendiente."
                    }, status=409)

                if seat.locked_at and seat.locked_at > cutoff:
                    if not owned_by_request(seat.locked_by_session, session_id, request):
                        return Response({
                            "error": f"El asiento {seat.seat_number} está reservado temporalmente."
                        }, status=409)

            # Operación todo-o-nada. Repetir la solicitud NO renueva el plazo.
            for seat in seats:
                if seat.id not in already_own_ids:
                    seat.locked_at = now
                    seat.locked_by_session = f"{owner}::{requested_day}"
                    seat.save(update_fields=['locked_at', 'locked_by_session'])

        return Response({"status": "locked", "expires_in_seconds": int(SEAT_HOLD_TTL.total_seconds())})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def unlock_seats(self, request):
        seat_ids = request.data.get('seat_ids')
        session_id = request.data.get('session_id')
        if not isinstance(session_id, str) or not SESSION_ID_PATTERN.fullmatch(session_id):
            return Response({"error": "Sesión inválida."}, status=400)
        if (not isinstance(seat_ids, list) or len(seat_ids) > MAX_SEATS_PER_SESSION
                or any(type(seat_id) is not int or seat_id <= 0 for seat_id in seat_ids)):
            return Response({"error": "Asientos inválidos."}, status=400)

        with transaction.atomic():
            seats = Seat.objects.select_for_update().filter(id__in=seat_ids)
            for seat in seats:
                if owned_by_request(seat.locked_by_session, session_id, request):
                    seat.locked_at = None
                    seat.locked_by_session = None
                    seat.save(update_fields=['locked_at', 'locked_by_session'])
        return Response({"status": "unlocked"})
