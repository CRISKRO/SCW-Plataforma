from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CreateOrderView, OrderViewSet

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('create-order/', CreateOrderView.as_view(), name='create-order'),
    path('', include(router.urls)),
]
