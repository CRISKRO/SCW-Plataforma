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
