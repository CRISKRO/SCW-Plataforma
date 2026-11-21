from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

from django.utils import timezone
from premium.models import UserSubscription

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    is_premium = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone_number', 'address', 'city', 'state', 'zipcode', 'role', 'is_premium', 'is_superuser')
        read_only_fields = ('id', 'role', 'email', 'is_premium', 'is_superuser')

    def get_role(self, obj):
        return obj.role

    def get_is_premium(self, obj):
        if obj.role in ['ADMIN', 'SUPERADMIN', 'PREMIUM']:
            return True
            
        has_active_sub = UserSubscription.objects.filter(
            user=obj, is_active=True, end_date__gt=timezone.now()
        ).exists()
        
        return has_active_sub

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
        return user
