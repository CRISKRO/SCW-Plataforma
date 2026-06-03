from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.utils import timezone
from django.db.models import Sum
from .models import get_active_config
from .serializers import SystemConfigurationSerializer
from events.models import Event, Fighter
from payments.models import Order
from django.contrib.auth import get_user_model

User = get_user_model()

class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        
        # Eventos activos (Programados o En Vivo)
        active_events = Event.objects.filter(status__in=['SCHEDULED', 'LIVE']).count()
        
        # Luchadores activos en el roster
        roster_count = Fighter.objects.filter(is_active=True).count()
        
        # Usuarios totales
        total_users = User.objects.count()
        
        # Ventas mensuales (Órdenes pagadas en el mes actual)
        current_month_orders = Order.objects.filter(
            status='PAID',
            created_at__year=now.year,
            created_at__month=now.month
        )
        monthly_sales = current_month_orders.aggregate(total=Sum('total_amount'))['total'] or 0

        return Response({
            "active_events": active_events,
            "roster_count": roster_count,
            "total_users": total_users,
            "monthly_sales": float(monthly_sales)
        })

class SystemConfigurationView(generics.RetrieveUpdateAPIView):
    """
    API view to retrieve and update the system's global configuration.
    Restricted to superadmins and admins (staff users).
    """
    serializer_class = SystemConfigurationSerializer
    permission_classes = [IsAdminUser]

    def get_object(self):
        return get_active_config()
