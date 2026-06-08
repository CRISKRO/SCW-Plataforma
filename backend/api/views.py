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
        
        # Órdenes pendientes de envío (PAID o PROCESSING)
        pending_orders_count = Order.objects.filter(status__in=['PAID', 'PROCESSING']).count()
        
        # Datos para la gráfica de ventas (últimos 7 días)
        from django.db.models.functions import TruncDate
        seven_days_ago = now - timezone.timedelta(days=7)
        recent_orders = Order.objects.filter(status='PAID', created_at__gte=seven_days_ago)
        sales_by_date = recent_orders.annotate(date=TruncDate('created_at')).values('date').annotate(total=Sum('total_amount')).order_by('date')
        
        sales_chart_data = []
        for i in range(7):
            day = (now - timezone.timedelta(days=6-i)).date()
            day_total = next((item['total'] for item in sales_by_date if item['date'] == day), 0)
            sales_chart_data.append({
                "date": day.strftime('%d/%m'),
                "total": float(day_total)
            })

        return Response({
            "active_events": active_events,
            "roster_count": roster_count,
            "total_users": total_users,
            "monthly_sales": float(monthly_sales),
            "pending_orders_count": pending_orders_count,
            "sales_chart_data": sales_chart_data
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

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        
        # Force explicitly updating registration_method to fix frontend state issue
        if 'registration_method' in request.data:
            instance = self.get_object()
            instance.registration_method = request.data['registration_method']
            instance.save(update_fields=['registration_method'])
            response.data['registration_method'] = instance.registration_method
            
        return response
