from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser, SAFE_METHODS
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer

class IsAdminOrReadOnly(IsAdminUser):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return super().has_permission(request, view)

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated and (user.is_staff or getattr(user, 'role', None) in ['ADMIN', 'SUPERADMIN']):
            return Product.objects.all().order_by('-created_at')
        return Product.objects.filter(is_active=True).order_by('-created_at')
