from django.urls import path
from .views import SystemConfigurationView, DashboardStatsView

urlpatterns = [
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('', SystemConfigurationView.as_view(), name='system-configuration'),
]
