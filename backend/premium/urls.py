from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubscriptionPlanViewSet, PremiumVideoViewSet, SubscribeView, MySubscriptionView, CancelSubscriptionView

router = DefaultRouter()
router.register(r'plans', SubscriptionPlanViewSet)
router.register(r'videos', PremiumVideoViewSet, basename='premium-videos')

urlpatterns = [
    path('subscribe/', SubscribeView.as_view(), name='premium-subscribe'),
    path('me/', MySubscriptionView.as_view(), name='premium-me'),
    path('cancel/', CancelSubscriptionView.as_view(), name='premium-cancel'),
    path('', include(router.urls)),
]
