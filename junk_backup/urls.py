from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard_index, name='dashboard_index'),
    
    # Events
    path('events/', views.event_list, name='dashboard_event_list'),
    path('events/new/', views.event_create, name='dashboard_event_create'),
    path('events/<int:pk>/edit/', views.event_edit, name='dashboard_event_edit'),
    path('events/<int:pk>/delete/', views.event_delete, name='dashboard_event_delete'),
]
