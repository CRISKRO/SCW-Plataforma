from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CreateOrderView, OrderViewSet, MPPublicKeyView, ProcessCardPaymentView, VerifyPaymentView, ValidateTicketView

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('create-order/', CreateOrderView.as_view(), name='create-order'),
    path('public-key/', MPPublicKeyView.as_view(), name='mp-public-key'),
    path('process-card/', ProcessCardPaymentView.as_view(), name='process-card'),
    path('verify/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('validate-ticket/', ValidateTicketView.as_view(), name='validate-ticket'),
    path('', include(router.urls)),
]
