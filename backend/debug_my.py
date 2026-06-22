import os
import django
import sys

# Setup django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from students.models import Enrollment
from students.views import EnrollmentSerializer

try:
    enrollment = Enrollment.objects.filter(status='APPROVED').first()
    if enrollment:
        print("Found enrollment:", enrollment.id)
        data = EnrollmentSerializer(enrollment).data
        print("Serialized data:", data.keys())
    else:
        print("No approved enrollment found.")
except Exception as e:
    import traceback
    traceback.print_exc()
