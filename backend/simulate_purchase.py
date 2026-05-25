import os
import django
import sys

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from payments.models import Order, OrderItem
from events.models import Event
from tickets.models import EventZone
from payments.email_tickets import send_ticket_email

def simulate():
    print("=== SIMULADOR DE COMPRA DE BOLETOS SCW ===")
    email = input("¿A qué correo enviamos el boleto QR? ")

    event = Event.objects.filter(status='SCHEDULED').first()
    if not event:
        print("❌ No hay eventos activos en la base de datos.")
        return

    zone = EventZone.objects.filter(event=event).first()
    if not zone:
        print(f"❌ El evento '{event.title}' no tiene zonas creadas.")
        return

    print(f"\nGenerando orden para el evento: {event.title}")
    print(f"Boleto: {zone.get_zone_type_display()} - ${zone.price}")

    # Crear la orden simulada
    order = Order.objects.create(
        user=None,
        contact_email=email,
        total_amount=zone.price,
        status='PAID',  # Simulamos que ya se pagó
        mp_payment_id='simulado_12345'
    )

    # Agregar el boleto a la orden
    OrderItem.objects.create(
        order=order,
        product_name=f"{event.title} - {zone.get_zone_type_display()}",
        quantity=1,
        price=zone.price,
        event=event
    )

    print(f"\n✅ Orden #{order.id} creada y pagada con éxito (Simulación).")
    print("📧 Generando código QR y enviando correo electrónico...")

    try:
        send_ticket_email(order)
        print(f"\n🎉 ¡ÉXITO! Revisa la bandeja de entrada de {email}")
        print("También revisa la carpeta de Spam por si acaso.")
        print(f"Cuando recibas el QR, puedes validarlo en tu App de Escaneo.")
    except Exception as e:
        print("\n❌ Error al enviar el correo:")
        print(e)
        print("\n¿Configuraste correctamente EMAIL_HOST_USER y EMAIL_HOST_PASSWORD en tu archivo .env?")

if __name__ == '__main__':
    simulate()
