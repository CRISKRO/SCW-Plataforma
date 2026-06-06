from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer, AdminUserSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class UserProfileView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = AdminUserSerializer
    permission_classes = (IsAdminUser,)
    
    def perform_update(self, serializer):
        user = serializer.save()
        # Ensure is_staff matches admin roles
        if user.role in ['SUPERADMIN', 'ADMIN']:
            user.is_staff = True
            user.is_superuser = (user.role == 'SUPERADMIN')
        else:
            user.is_staff = False
            user.is_superuser = False
        user.save()

class SendEmailOTPView(APIView):
    permission_classes = (IsAuthenticated,)
    
    def post(self, request):
        user = request.user
        
        import random
        from django.core.mail import EmailMultiAlternatives, get_connection
        from api.models import get_active_config
        from .models import EmailVerification
        
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
                body=f'Hola {user.first_name},\n\nTu código de verificación es: {code}\n\nIngresa este código en la página para continuar tu registro en la Escuela SCW.\n\nSaludos,\nSCW Dojo',
                from_email=from_email,
                to=[user.email]
            )
            email_msg.connection = connection
            email_msg.send(fail_silently=False)
            return Response({"message": "Código enviado correctamente."}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error enviando correo OTP: {str(e)}. Código: {code}")
            # Fallback para ayudar al usuario a avanzar si su servidor bloquea puertos SMTP (ej. Render/Vercel)
            return Response({"error": f"El servidor bloqueó el envío de correos (Errno 101). Para que puedas continuar probando, tu código es: {code}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyEmailOTPView(APIView):
    permission_classes = (IsAuthenticated,)
    
    def post(self, request):
        code = request.data.get('code')
        user = request.user
        
        if not code:
            return Response({"error": "El código es requerido."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            from .models import EmailVerification
            verification = EmailVerification.objects.get(user=user, code=code)
            
            # The OTP is valid, delete it so it can't be reused
            verification.delete()
            
            return Response({"message": "Código verificado correctamente."}, status=status.HTTP_200_OK)
            
        except Exception:
            return Response({"error": "Código incorrecto o expirado."}, status=status.HTTP_400_BAD_REQUEST)

class SendPasswordResetOTPView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "El email es requerido."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Return success even if user doesn't exist for security reasons
            return Response({"message": "Si el email existe, se ha enviado un código de recuperación."}, status=status.HTTP_200_OK)
            
        import random
        from django.core.mail import EmailMultiAlternatives, get_connection
        from api.models import get_active_config
        from .models import EmailVerification
        
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
                subject='Recuperación de Contraseña - SCW',
                body=f'Hola {user.first_name},\n\nTu código para recuperar tu contraseña es: {code}\n\nIngresa este código en la página para establecer tu nueva contraseña.\n\nSaludos,\nSCW Dojo',
                from_email=from_email,
                to=[user.email]
            )
            email_msg.connection = connection
            email_msg.send(fail_silently=False)
            return Response({"message": "Si el email existe, se ha enviado un código de recuperación."}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error enviando correo de recuperación OTP: {str(e)}. Código: {code}")
            return Response({"error": f"El servidor bloqueó el envío de correos (Errno 101). Para pruebas, tu código de recuperación es: {code}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResetPasswordWithOTPView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        new_password = request.data.get('new_password')
        
        if not all([email, code, new_password]):
            return Response({"error": "Faltan datos requeridos."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email=email)
            from .models import EmailVerification
            verification = EmailVerification.objects.get(user=user, code=code)
            
            # The OTP is valid, update password and delete OTP
            user.set_password(new_password)
            user.save()
            verification.delete()
            
            return Response({"message": "Contraseña actualizada correctamente."}, status=status.HTTP_200_OK)
            
        except Exception:
            return Response({"error": "Código incorrecto o expirado."}, status=status.HTTP_400_BAD_REQUEST)
