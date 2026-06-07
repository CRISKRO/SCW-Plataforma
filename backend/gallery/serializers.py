from rest_framework import serializers
from .models import GalleryImage

class GalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = GalleryImage
        fields = ['id', 'title', 'category', 'image', 'col_span', 'row_span', 'created_at']
        read_only_fields = ['id', 'created_at']
