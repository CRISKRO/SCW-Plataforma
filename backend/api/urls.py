from django.urls import path
from .views import SystemConfigurationView, DashboardStatsView, SendWhatsAppReminderView

urlpatterns = [
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('whatsapp/send-reminder/', SendWhatsAppReminderView.as_view(), name='send-whatsapp-reminder'),
    path('', SystemConfigurationView.as_view(), name='system-configuration'),
]
