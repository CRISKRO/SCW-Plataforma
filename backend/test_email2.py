
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from payments.models import Order
from payments.email_orders import send_new_merch_admin_email
from django.core.mail import EmailMultiAlternatives, get_connection
from django.conf import settings
from api.models import get_active_config

order = Order.objects.last()
config = get_active_config()
print('Config Admin Email:', config.admin_notification_email)
print('Config Default From Email:', config.default_from_email)

res = send_new_merch_admin_email(order)
print('Normal call result:', res)

