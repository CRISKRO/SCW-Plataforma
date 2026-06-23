from rest_framework import serializers
from .models import SystemConfiguration

class SystemConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfiguration
        fields = [
            'id',
            'mercadopago_public_key',
            'mercadopago_access_token',
            'mercadopago_commission_rate',
            'email_host',
            'email_port',
            'email_use_tls',
            'email_host_user',
            'email_host_password',
            'default_from_email',
            'admin_notification_email',
            'whatsapp_phone_number_id',
            'whatsapp_access_token',
            'whatsapp_enabled',
            'tuition_fee',
            'registration_method',
        ]
        # In a real-world app we might obfuscate or write-only the password/token fields
        # if other roles had access. Since this API is strictly staff/admin only, we can
        # expose them for editing, or write custom handling if needed.
