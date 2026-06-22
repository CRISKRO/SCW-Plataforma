import os
import django
import sys

# Setup django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from students.models import Enrollment

User = get_user_model()

# Create dummy user and admin
user, _ = User.objects.get_or_create(email="teststudent@example.com", defaults={"first_name": "Test", "role": "USER"})
admin, _ = User.objects.get_or_create(email="testadmin@example.com", defaults={"first_name": "Admin", "role": "ADMIN", "is_staff": True, "is_superuser": True})

# Create dummy enrollment without files
enrollment = Enrollment.objects.create(
    name="Test Student",
    email="teststudent@example.com",
    age=25,
    phone="1234567890",
    status="APPROVED"
)

client = Client()

print("--- Testing /api/students/enrollments/my/ ---")
client.force_login(user)
resp = client.get('/api/students/enrollments/my/')
print("Status:", resp.status_code)
print("Data:", resp.content)

print("\n--- Testing DELETE /api/students/enrollments/{id}/ ---")
client.force_login(admin)
resp = client.delete(f'/api/students/enrollments/{enrollment.id}/')
print("Status:", resp.status_code)
print("Data:", resp.content)

# Clean up
try:
    enrollment.delete()
except:
    pass
