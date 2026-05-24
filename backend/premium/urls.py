from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubscriptionPlanViewSet, PremiumVideoViewSet, SubscribeView

router = DefaultRouter()
router.register(r'plans', SubscriptionPlanViewSet)
router.register(r'videos', PremiumVideoViewSet, basename='premium-videos')

urlpatterns = [
    path('subscribe/', SubscribeView.as_view(), name='premium-subscribe'),
    path('', include(router.urls)),
]
