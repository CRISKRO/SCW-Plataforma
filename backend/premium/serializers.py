from rest_framework import serializers
from .models import SubscriptionPlan, PremiumVideo

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

class PremiumVideoSerializer(serializers.ModelSerializer):
    youtube_id = serializers.SerializerMethodField()

    class Meta:
        model = PremiumVideo
        fields = '__all__'

    def get_youtube_id(self, obj):
        import re
        if obj.video_url:
            match = re.search(r'(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})', obj.video_url)
            return match.group(1) if match else None
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        show_url = False
        
        if request and request.user and request.user.is_authenticated:
            user = request.user
            is_admin = user.is_staff or getattr(user, 'role', None) in ['ADMIN', 'SUPERADMIN']
            is_premium = getattr(user, 'role', None) == 'PREMIUM'
            
            has_active_sub = False
            if not (is_admin or is_premium):
                from django.utils import timezone
                from .models import UserSubscription
                has_active_sub = UserSubscription.objects.filter(
                    user=user, is_active=True, end_date__gt=timezone.now()
                ).exists()
                
            if is_admin or is_premium or has_active_sub:
                show_url = True
                
        if not show_url:
            data['video_url'] = None
            
        return data
