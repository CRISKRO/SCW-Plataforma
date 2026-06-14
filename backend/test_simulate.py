import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from payments.models import Order, OrderItem
from payments.email_tickets import send_ticket_email

print("Creating fake order...")
order = Order.objects.create(
    user=None,
    contact_email="boletos.scw@gmail.com",
    total_amount=100.0,
    status='PAID',
    mp_payment_id='test1234'
)
OrderItem.objects.create(
    order=order,
    product_name="Boleto General",
    quantity=1,
    price=100.0,
    size=''
)

print("Calling send_ticket_email...")
try:
    send_ticket_email(order)
    print("Success!")
except Exception as e:
    import traceback
    traceback.print_exc()
