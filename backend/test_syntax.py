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

order = Order(user=None, contact_email="test@test.com")
print(order.user)
print("Is None?", order.user is None)

try:
    buyer = order.user.get_full_name() if order.user else order.contact_email
    print("Buyer:", buyer)
except Exception as e:
    print("Error:", e)
