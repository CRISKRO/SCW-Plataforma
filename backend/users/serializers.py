from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

from django.utils import timezone
from premium.models import UserSubscription

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone_number', 'role')
        read_only_fields = ('id', 'role')

    def get_role(self, obj):
        # Admins keep their roles
        if obj.role in ['ADMIN', 'SUPERADMIN']:
            return obj.role
        
        # Check active subscription
        has_active_sub = UserSubscription.objects.filter(
            user=obj, is_active=True, end_date__gt=timezone.now()
        ).exists()
        
        if has_active_sub or obj.role == 'PREMIUM':
            return 'PREMIUM'
            
        return obj.role

class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone_number', 'role', 'is_active')
        read_only_fields = ('id', 'email')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'phone_number', 'password', 'password_confirm')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', '')
        )
        user.is_active = False
        user.save()
        
        import random
        from django.core.mail import EmailMultiAlternatives, get_connection
        from api.models import get_active_config
        from users.models import EmailVerification
        
        code = f"{random.randint(100000, 999999)}"
        EmailVerification.objects.update_or_create(user=user, defaults={'code': code})
        
        config = get_active_config()
        from_email = config.default_from_email if config.default_from_email else 'SCW Boletos <boletos.scw@gmail.com>'
        
        connection = None
        if config and config.email_host_user and config.email_host_password:
            connection = get_connection(
                host=config.email_host,
                port=config.email_port,
                username=config.email_host_user,
                password=config.email_host_password,
                use_tls=config.email_use_tls,
            )
        
        try:
            email_msg = EmailMultiAlternatives(
                subject='Código de Verificación - SCW',
                body=f'Hola {user.first_name},\n\nTu código de verificación es: {code}\n\nIngresa este código en la página para activar tu cuenta.\n\nSaludos,\nSCW Dojo',
                from_email=from_email,
                to=[user.email]
            )
            email_msg.send(fail_silently=False, connection=connection)
        except Exception as e:
            print("Error enviando correo OTP:", e)
            
        return user
