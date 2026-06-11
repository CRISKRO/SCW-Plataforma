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
        if event_id:
            zones = self.queryset.filter(event_id=event_id).prefetch_related('seats')
            serializer = self.get_serializer(zones, many=True)
            data = [dict(zone) for zone in serializer.data]
            
            from api.models import get_active_config
            config = get_active_config()
            commission = float(config.mercadopago_commission_rate)
            
            for zone in data:
                zone['price'] = str(round(float(zone['price']) * (1 + commission), 2))
                
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
        
        if not seat_ids or not session_id:
            return Response({"error": "seat_ids y session_id son requeridos"}, status=400)
            
        from django.utils import timezone
        from datetime import timedelta
        
        # Verify no seat is already locked by someone else or sold
        seats = Seat.objects.filter(id__in=seat_ids)
        if len(seats) != len(seat_ids):
            return Response({"error": "Algunos asientos no existen"}, status=404)
            
        for seat in seats:
            if not seat.is_available:
                return Response({"error": f"El asiento {seat.seat_number} ya fue vendido."}, status=400)
            if seat.locked_at and seat.locked_by_session != session_id:
                if timezone.now() < seat.locked_at + timedelta(minutes=10):
                    return Response({"error": f"El asiento {seat.seat_number} de la fila {seat.row_name} está reservado temporalmente por otro usuario."}, status=400)
                    
        # Lock them
        now = timezone.now()
        for seat in seats:
            seat.locked_at = now
            seat.locked_by_session = session_id
            seat.save()
            
        return Response({"status": "locked"})
