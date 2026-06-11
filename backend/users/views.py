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

class UserProfileView(generics.RetrieveUpdateAPIView):
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
        
        import re
        match = re.search(r'<([^>]+)>', from_email)
        from_email_clean = match.group(1).strip() if match else from_email.strip()

        try:
            email_msg = EmailMultiAlternatives(
                subject='Código de Verificación - SCW',
                body=f'Hola {user.first_name},\n\nTu código de verificación es: {code}\n\nIngresa este código en la página para continuar tu registro en la Escuela SCW.\n\nSaludos,\nSCW DOJO',
                from_email=from_email_clean,
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
        
        import re
        match = re.search(r'<([^>]+)>', from_email)
        from_email_clean = match.group(1).strip() if match else from_email.strip()

        try:
            email_msg = EmailMultiAlternatives(
                subject='Recuperación de Contraseña - SCW',
                body=f'Hola {user.first_name},\n\nTu código para recuperar tu contraseña es: {code}\n\nIngresa este código en la página para establecer tu nueva contraseña.\n\nSaludos,\nSCW DOJO',
                from_email=from_email_clean,
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

class SendRegisterEmailOTPView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "El email es requerido."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check if email is already taken
        if User.objects.filter(email=email).exists():
            return Response({"error": "Este correo ya está registrado."}, status=status.HTTP_400_BAD_REQUEST)
            
        import random
        from django.core.mail import EmailMultiAlternatives, get_connection
        from django.core.cache import cache
        from api.models import get_active_config
        
        code = f"{random.randint(100000, 999999)}"
        # Store in cache for 10 minutes
        cache.set(f"register_otp_{email}", code, timeout=600)
        
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
        
        import re
        match = re.search(r'<([^>]+)>', from_email)
        from_email_clean = match.group(1).strip() if match else from_email.strip()

        try:
            email_msg = EmailMultiAlternatives(
                subject='Código de Verificación - Registro SCW',
                body=f'Hola,\n\nTu código de verificación para completar tu registro es: {code}\n\nIngresa este código en la página para crear tu cuenta.\n\nSaludos,\nSCW DOJO',
                from_email=from_email_clean,
                to=[email]
            )
            email_msg.connection = connection
            email_msg.send(fail_silently=False)
            return Response({"message": "Código enviado correctamente."}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error enviando correo OTP de registro: {str(e)}. Código: {code}")
            return Response({"error": f"El servidor bloqueó el envío de correos. Para pruebas, tu código es: {code}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyRegisterEmailOTPView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        
        if not email or not code:
            return Response({"error": "Email y código son requeridos."}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.core.cache import cache
        cached_code = cache.get(f"register_otp_{email}")
        
        if cached_code and cached_code == code:
            cache.delete(f"register_otp_{email}")
            return Response({"message": "Código verificado correctamente."}, status=status.HTTP_200_OK)
            
        return Response({"error": "Código incorrecto o expirado."}, status=status.HTTP_400_BAD_REQUEST)

class GoogleLoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({"error": "No se proporcionó el token de Google."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            from django.conf import settings
            import os

            # Verify the token
            # If NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured, we'll try to get it from settings/env
            # To allow testing, if no CLIENT_ID is found, we can pass audience=None, but it's not secure.
            # Ideally the client id is in the backend settings.
            client_id = os.getenv('GOOGLE_CLIENT_ID', os.getenv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', ''))
            
            try:
                # We skip audience validation here if client_id is not set, 
                # but it's highly recommended to configure it for production.
                idinfo = id_token.verify_oauth2_token(
                    token, 
                    google_requests.Request(), 
                    client_id if client_id else None
                )
            except ValueError as e:
                # Invalid token
                return Response({"error": f"Token de Google inválido: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            if not email:
                return Response({"error": "El token de Google no contiene un email."}, status=status.HTTP_400_BAD_REQUEST)

            # Try to get the user
            user = User.objects.filter(email=email).first()
            
            if not user:
                # Create a new user
                import secrets
                import string
                alphabet = string.ascii_letters + string.digits
                password = ''.join(secrets.choice(alphabet) for i in range(20))

                user = User.objects.create_user(
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name
                )

            # Generate tokens
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Login con Google exitoso'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Error al procesar el login con Google: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
