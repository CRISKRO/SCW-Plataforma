from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CreateOrderView, OrderViewSet, MPPublicKeyView, ProcessCardPaymentView, VerifyPaymentView, ValidateTicketView, WebhookView, MyOrdersView, TestEmailView, ApproveTransferView, BoxOfficeEventsView, BoxOfficeSellView

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('create-order/', CreateOrderView.as_view(), name='create-order'),
    path('public-key/', MPPublicKeyView.as_view(), name='mp-public-key'),
    path('process-card/', ProcessCardPaymentView.as_view(), name='process-card'),
    path('verify/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('validate-ticket/', ValidateTicketView.as_view(), name='validate-ticket'),
    path('webhook/', WebhookView.as_view(), name='webhook'),
    path('my-orders/', MyOrdersView.as_view(), name='my-orders'),
    path('test-email/', TestEmailView.as_view(), name='test-email'),
    path('approve-transfer/<str:token>/', ApproveTransferView.as_view(), name='approve-transfer'),
    path('box-office-events/', BoxOfficeEventsView.as_view(), name='box-office-events'),
    path('box-office-sell/', BoxOfficeSellView.as_view(), name='box-office-sell'),
    path('', include(router.urls)),
]
