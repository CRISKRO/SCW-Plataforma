import os
import django
from django.core.mail import send_mail

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
print(f"EMAIL_HOST_PASSWORD configured: {bool(settings.EMAIL_HOST_PASSWORD)}")
print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")

try:
    send_mail(
        subject="Test Direct from Django",
        message="This is a test message to verify SMTP settings.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=["christianochoa436@gmail.com"],
        fail_silently=False,
    )
    print("Direct email sent successfully!")
except Exception as e:
    print(f"Failed: {e}")
