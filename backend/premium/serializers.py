from rest_framework import serializers
from .models import SubscriptionPlan, PremiumVideo

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

class PremiumVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PremiumVideo
        fields = '__all__'
