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

class VerifyEmailView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        
        if not email or not code:
            return Response({"error": "Email y código son requeridos."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email=email)
            if user.is_active:
                return Response({"message": "La cuenta ya está activa."}, status=status.HTTP_200_OK)
                
            from .models import EmailVerification
            verification = EmailVerification.objects.get(user=user, code=code)
            
            user.is_active = True
            user.save()
            verification.delete()
            
            return Response({"message": "Cuenta activada correctamente."}, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({"error": "Código incorrecto o expirado."}, status=status.HTTP_400_BAD_REQUEST)
