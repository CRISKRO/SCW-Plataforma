import os
import django
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from payments.models import Order, OrderItem
from raffles.models import Raffle, RaffleTicket

# Ensure there's a raffle
raffle, _ = Raffle.objects.get_or_create(title="Test Raffle", price=100.0, total_tickets=10)

# Create an order
order = Order.objects.create(
    contact_email="test@test.com",
    total_amount=100.0,
    status=Order.Status.PAID
)

# Create order item
item = OrderItem.objects.create(
    order=order,
    product_name="Test Raffle Ticket",
    price=100.0,
    quantity=1
)

# Grab ticket 1
rt = RaffleTicket.objects.get(raffle=raffle, number=1)
rt.order_item = item
rt.save()

# Now simulate VerifyPayment logic
print("Before:", rt.status)

for o_item in order.items.all():
    print("Has attrs:", hasattr(o_item, 'raffle_tickets'))
    if hasattr(o_item, 'raffle_tickets'):
        for ticket in o_item.raffle_tickets.all():
            ticket.status = RaffleTicket.Status.SOLD_ONLINE
            ticket.buyer_name = "Buyer"
            ticket.save()

rt.refresh_from_db()
print("After:", rt.status)
