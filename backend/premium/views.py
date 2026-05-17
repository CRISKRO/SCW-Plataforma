from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.response import Response
from .models import SubscriptionPlan, PremiumVideo, UserSubscription
from .serializers import SubscriptionPlanSerializer, PremiumVideoSerializer
from django.utils import timezone

class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [AllowAny]

class IsPremiumOrAdmin(BasePermission):
    """Admins can write; authenticated premium users can read."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True  # Any authenticated user can read (queryset filters below)
        return request.user.is_staff or getattr(request.user, 'role', None) in ['ADMIN', 'SUPERADMIN']

class PremiumVideoViewSet(viewsets.ModelViewSet):
    serializer_class = PremiumVideoSerializer
    permission_classes = [IsPremiumOrAdmin]

    def get_queryset(self):
        user = self.request.user
        # Admins see all videos
        if user.is_staff or getattr(user, 'role', None) in ['ADMIN', 'SUPERADMIN']:
            return PremiumVideo.objects.all().order_by('-release_date')
        # Premium/subscriber users see only published videos
        has_active_sub = UserSubscription.objects.filter(
            user=user, is_active=True, end_date__gt=timezone.now()
        ).exists()
        if getattr(user, 'role', None) in ['PREMIUM'] or has_active_sub:
            return PremiumVideo.objects.filter(is_published=True).order_by('-release_date')
        return PremiumVideo.objects.none()
