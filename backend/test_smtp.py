import os
import django
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.mail import send_mail, get_connection
from api.models import get_active_config

config = get_active_config()
print(f"Host: {config.email_host}")
print(f"Port: {config.email_port}")
print(f"User: {config.email_host_user}")
print(f"Pass: {'***' if config.email_host_password else 'NONE'}")
print(f"TLS: {config.email_use_tls}")

try:
    connection = get_connection(
        host=config.email_host,
        port=config.email_port,
        username=config.email_host_user,
        password=config.email_host_password,
        use_tls=config.email_use_tls
    )
    print("Testing connection...")
    connection.open()
    print("Connection SUCCESSFUL!")
    connection.close()
except Exception as e:
    print(f"Connection FAILED: {e}")
