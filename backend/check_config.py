import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from api.models import SystemConfiguration

configs = SystemConfiguration.objects.all()
for c in configs:
    print(f"ID: {c.id}, Tuition: {c.tuition_fee}, Enrollment: {c.enrollment_fee}")
