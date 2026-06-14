from rest_framework import viewsets
from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Fighter, Event, Match, Chronicle
from .serializers import FighterSerializer, EventSerializer, MatchSerializer, ChronicleSerializer

class IsAdminOrReadOnly(BasePermission):
    """Allow anyone to read; only admin/staff users can write."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or getattr(request.user, 'role', None) in ['ADMIN', 'SUPERADMIN'])
        )

class FighterViewSet(viewsets.ModelViewSet):
    queryset = Fighter.objects.all()
    serializer_class = FighterSerializer
    permission_classes = [IsAdminOrReadOnly]

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.prefetch_related('matches__fighters').all()
    serializer_class = EventSerializer
    permission_classes = [IsAdminOrReadOnly]

class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    permission_classes = [IsAdminOrReadOnly]

class ChronicleViewSet(viewsets.ModelViewSet):
    queryset = Chronicle.objects.all()
    serializer_class = ChronicleSerializer
    permission_classes = [IsAdminOrReadOnly]
