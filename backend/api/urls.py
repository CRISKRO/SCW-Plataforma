from django.urls import path
from .views import SystemConfigurationView

urlpatterns = [
    path('', SystemConfigurationView.as_view(), name='system-configuration'),
]
