import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from payments.models import Order, OrderItem
from payments.email_tickets import send_ticket_email

# Create test order
order = Order.objects.create(
    contact_email='christianochoa436@gmail.com',
    total_amount=500.00,
    status=Order.Status.PAID
)

# Create test items
OrderItem.objects.create(
    order=order,
    product_name='Boleto Ringside Norte - VIP',
    quantity=1,
    price=250.00,
    size='Fila A - Asiento 1'
)
OrderItem.objects.create(
    order=order,
    product_name='Boleto Ringside Norte - VIP',
    quantity=1,
    price=250.00,
    size='Fila A - Asiento 2'
)

print(f"Testing email for Order {order.id}...")
try:
    send_ticket_email(order)
    print("Email sent successfully!")
except Exception as e:
    print(f"Error sending email: {e}")
