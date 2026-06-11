from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, UserProfileView, UserViewSet, 
    SendEmailOTPView, VerifyEmailOTPView,
    SendPasswordResetOTPView, ResetPasswordWithOTPView,
    SendRegisterEmailOTPView, VerifyRegisterEmailOTPView,
    GoogleLoginView
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('send-email-otp/', SendEmailOTPView.as_view(), name='send_email_otp'),
    path('verify-email-otp/', VerifyEmailOTPView.as_view(), name='verify_email_otp'),
    path('send-register-otp/', SendRegisterEmailOTPView.as_view(), name='send_register_otp'),
    path('verify-register-otp/', VerifyRegisterEmailOTPView.as_view(), name='verify_register_otp'),
    path('password-reset-otp/', SendPasswordResetOTPView.as_view(), name='send_password_reset_otp'),
    path('password-reset-confirm/', ResetPasswordWithOTPView.as_view(), name='reset_password_with_otp'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('login/google/', GoogleLoginView.as_view(), name='google_login'),
    path('profile/', UserProfileView.as_view(), name='auth_profile'),
    path('', include(router.urls)),
]
