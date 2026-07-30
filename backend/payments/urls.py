from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CreateOrderView, OrderViewSet, MPPublicKeyView, ProcessCardPaymentView, 
    VerifyPaymentView, ValidateTicketView, WebhookView, StripeWebhookView, MyOrdersView, 
    TestEmailView, ApproveTransferView, BoxOfficeEventsView, BoxOfficeSellView,
    BoxOfficeRafflesView, BoxOfficeSellRaffleView, BoxOfficeDojoStudentView, BoxOfficeDojoPaymentView,
    GenerateCourtesyTicketView, CouponViewSet, ValidateCouponView
)

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'coupons', CouponViewSet, basename='coupon')

urlpatterns = [
    path('create-order/', CreateOrderView.as_view(), name='create-order'),
    path('coupons/validate/', ValidateCouponView.as_view(), name='validate-coupon'),
    path('public-key/', MPPublicKeyView.as_view(), name='mp-public-key'),
    path('process-card/', ProcessCardPaymentView.as_view(), name='process-card'),
    path('verify/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('validate-ticket/', ValidateTicketView.as_view(), name='validate-ticket'),
    path('webhook/', WebhookView.as_view(), name='webhook'),
    path('stripe-webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('my-orders/', MyOrdersView.as_view(), name='my-orders'),
    path('test-email/', TestEmailView.as_view(), name='test-email'),
    path('approve-transfer/<str:token>/', ApproveTransferView.as_view(), name='approve-transfer'),
    path('box-office-events/', BoxOfficeEventsView.as_view(), name='box-office-events'),
    path('box-office-sell/', BoxOfficeSellView.as_view(), name='box-office-sell'),
    path('box-office-raffles/', BoxOfficeRafflesView.as_view(), name='box-office-raffles'),
    path('box-office-sell-raffle/', BoxOfficeSellRaffleView.as_view(), name='box-office-sell-raffle'),
    path('box-office-dojo-student/<int:pk>/', BoxOfficeDojoStudentView.as_view(), name='box-office-dojo-student'),
    path('box-office-dojo-payment/<int:pk>/', BoxOfficeDojoPaymentView.as_view(), name='box-office-dojo-payment'),
    path('courtesy-ticket/', GenerateCourtesyTicketView.as_view(), name='courtesy-ticket'),
    path('', include(router.urls)),
]
