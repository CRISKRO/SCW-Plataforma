import os
import django
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from payments.models import Order
order = Order.objects.last()
print(f"Order ID: {order.id}")
print("Order items:", order.items.count())
for item in order.items.all():
    print(f"Item: {item.product_name}")
    print(f"  RaffleTickets related manager exists? {hasattr(item, 'raffle_tickets')}")
    print(f"  RaffleTickets count: {item.raffle_tickets.count()}")

has_merch = order.items.filter(event__isnull=True, raffle_tickets__isnull=True).exists()
has_raffles = order.items.filter(raffle_tickets__isnull=False).exists()

print(f"has_merch: {has_merch}")
print(f"has_raffles: {has_raffles}")
