import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SCW.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from payments.models import Order
from payments.email_orders import send_order_receipt_email

try:
    order = Order.objects.last()
    print("Testing with order:", order)
    send_order_receipt_email(order)
    print("Success!")
except Exception as e:
    import traceback
    traceback.print_exc()
