from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FighterViewSet, EventViewSet, MatchViewSet, ChronicleViewSet, SponsorViewSet

router = DefaultRouter()
router.register(r'fighters', FighterViewSet)
router.register(r'events', EventViewSet)
router.register(r'matches', MatchViewSet)
router.register(r'chronicles', ChronicleViewSet)
router.register(r'sponsors', SponsorViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
