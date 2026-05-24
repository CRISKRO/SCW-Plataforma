import os
import django
from email.mime.image import MIMEImage

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from payments.models import Order, OrderItem
from payments.email_tickets import send_ticket_email
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from payments.qr import generate_ticket_qr

def send_fixed_ticket_email(order):
    items = order.items.all()
    qr_images = []
    items_html = ""
    for item in items:
        items_html += f"""
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
          <p style="color:#aaa;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Boleto</p>
          <h3 style="color:#fff;margin:0 0 4px;font-size:18px;">{item.product_name}</h3>
          {'<p style="color:#888;font-size:13px;margin:0 0 16px;">' + item.size + '</p>' if item.size else '<div style="margin-bottom:16px;"></div>'}
          <img src="cid:qr_{item.id}" width="200" height="200" alt="QR Boleto" style="border-radius:8px;"/>
          <p style="color:#666;font-size:11px;margin:12px 0 0;">Presenta este código en la entrada</p>
        </div>
        """

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#000;font-family:'Helvetica Neue',Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <h1 style="color:#fff;text-align:center;">SCW Pro Wrestling</h1>
        <h2 style="color:#fff;text-align:center;">¡Pago Confirmado!</h2>
        {items_html}
      </div>
    </body>
    </html>
    """

    text_body = f"¡Pago confirmado! Orden #{order.id}."

    email = EmailMultiAlternatives(
        subject=f"🎟️ Tus Boletos SCW – Orden #{order.id} (Prueba Fix)",
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[order.contact_email]
    )
    email.attach_alternative(html_body, "text/html")

    # Correct inline attachment
    for item in items:
        qr_buf = generate_ticket_qr(order.id, item.id, item.product_name)
        img = MIMEImage(qr_buf.read())
        img.add_header('Content-ID', f'<qr_{item.id}>')
        img.add_header('Content-Disposition', 'inline', filename=f'boleto_{item.id}.png')
        email.attach(img)

    email.send(fail_silently=False)
    return True

order = Order.objects.get(id=18)  # Using the one we created
print(f"Testing fixed email for Order {order.id}...")
try:
    send_fixed_ticket_email(order)
    print("Fixed Email sent successfully!")
except Exception as e:
    print(f"Error sending email: {e}")
