from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FighterViewSet, EventViewSet, MatchViewSet, ChronicleViewSet

router = DefaultRouter()
router.register(r'fighters', FighterViewSet)
router.register(r'events', EventViewSet)
router.register(r'matches', MatchViewSet)
router.register(r'chronicles', ChronicleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
