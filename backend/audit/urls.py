from django.urls import path

from .views import AuditLogList, TrackPageView

urlpatterns = [
    path("logs/", AuditLogList.as_view(), name="audit-logs"),
    path("track/", TrackPageView.as_view(), name="audit-track"),
]
