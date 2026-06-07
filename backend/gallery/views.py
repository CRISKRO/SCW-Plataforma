from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly, SAFE_METHODS
from rest_framework.parsers import MultiPartParser, FormParser
from .models import GalleryImage
from .serializers import GalleryImageSerializer

class IsAdminOrReadOnlyPermission(IsAuthenticatedOrReadOnly):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.role in ['SUPERADMIN', 'ADMIN']

class GalleryImageViewSet(viewsets.ModelViewSet):
    queryset = GalleryImage.objects.all()
    serializer_class = GalleryImageSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAdminOrReadOnlyPermission]
