from rest_framework import generics
from rest_framework.permissions import IsAdminUser
from .models import get_active_config
from .serializers import SystemConfigurationSerializer

class SystemConfigurationView(generics.RetrieveUpdateAPIView):
    """
    API view to retrieve and update the system's global configuration.
    Restricted to superadmins and admins (staff users).
    """
    serializer_class = SystemConfigurationSerializer
    permission_classes = [IsAdminUser]

    def get_object(self):
        return get_active_config()
