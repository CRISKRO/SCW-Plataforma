from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventZoneViewSet, SeatViewSet

router = DefaultRouter()
router.register(r'zones', EventZoneViewSet)
router.register(r'seats', SeatViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
