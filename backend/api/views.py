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

import requests

class SendWhatsAppReminderView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        phone = request.data.get('phone')
        message = request.data.get('message')

        if not phone or not message:
            return Response({"success": False, "error": "Teléfono y mensaje son obligatorios"}, status=400)

        config = get_active_config()
        if not config.whatsapp_enabled or not config.whatsapp_phone_number_id or not config.whatsapp_access_token:
            return Response({"success": False, "error": "WhatsApp no está configurado o está deshabilitado en el sistema"}, status=400)

        phone_str = str(phone)
        if not phone_str.startswith('52'):
            phone_str = '52' + phone_str

        headers = {
            "Authorization": f"Bearer {config.whatsapp_access_token}",
            "Content-Type": "application/json"
        }
        
        # Enviar como texto. NOTA: Para plantillas frías usar "type": "template"
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_str,
            "type": "text",
            "text": {
                "body": message
            }
        }
        
        meta_url = f"https://graph.facebook.com/v19.0/{config.whatsapp_phone_number_id}/messages"
        
        try:
            response = requests.post(meta_url, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                return Response({"success": True, "message": "Recordatorio enviado por Meta"})
            else:
                return Response({"success": False, "error": f"Error de Meta API: {response.text}"}, status=response.status_code)
        except Exception as e:
            return Response({"success": False, "error": str(e)}, status=500)
