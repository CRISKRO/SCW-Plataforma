
import os, django, sys, traceback
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from payments.models import Order
from payments.email_orders import send_new_merch_admin_email

order = Order.objects.filter(items__product__isnull=False).last()
if not order:
    print('No merch orders found.')
    sys.exit(0)

print(f'Testing order #{order.id}')
try:
    res = send_new_merch_admin_email(order)
    print(f'Result: {res}')
except Exception as e:
    traceback.print_exc()

