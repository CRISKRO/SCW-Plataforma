"""
Email sending for SCW ticket confirmation.
Sends a beautiful HTML email with QR codes attached for each purchased item.
"""
import base64
from email.mime.image import MIMEImage
from django.core.mail import EmailMultiAlternatives, get_connection
from django.conf import settings
from .qr import generate_group_ticket_qr, group_order_items
from api.models import get_active_config


def send_ticket_email(order):
    """
    Send a ticket confirmation email with grouped QR codes (1 QR code per contiguous block/area).
    """
    groups = group_order_items(order)
    
    if not groups:
        return False

    # Build QR attachments
    qr_images = []
    items_html = ""
    for group in groups:
        qr_buf = generate_group_ticket_qr(order.id, group['item_ids'], group['title'])
        qr_b64 = base64.b64encode(qr_buf.read()).decode()
        cid_str = f"qr_{group['group_id']}@scw.boletos"
        qr_images.append({
            'group': group,
            'b64': qr_b64,
            'cid': cid_str
        })
        qty_badge = f"{group['quantity']} Boleto{'s' if group['quantity'] > 1 else ''}"
        items_html += f"""
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
          <p style="color:#e00;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;font-weight:bold;">{qty_badge}</p>
          <h3 style="color:#fff;margin:0 0 4px;font-size:18px;">{group['title']}</h3>
          <p style="color:#22c55e;font-size:14px;font-weight:bold;margin:0 0 16px;">{group['subtitle']}</p>
          <img src="cid:{cid_str}" width="220" height="220" alt="QR Boleto" style="border-radius:8px;"/>
          <p style="color:#888;font-size:11px;margin:12px 0 0;">Presenta este código en la entrada (Válido para {qty_badge})</p>
        </div>
        """

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#000;font-family:'Helvetica Neue',Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        
        <!-- Header -->
        <div style="text-align:center;margin-bottom:40px;">
          <h1 style="color:#fff;font-size:32px;font-weight:900;letter-spacing:-1px;margin:0;text-transform:uppercase;">SCW</h1>
          <p style="color:#e00;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:4px 0 0;">Pro Wrestling</p>
        </div>

        <!-- Confirmation Banner -->
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:16px;padding:24px;text-align:center;margin-bottom:32px;">
          <p style="font-size:32px;margin:0;">✅</p>
          <h2 style="color:#fff;font-size:24px;font-weight:900;margin:8px 0 4px;">¡Pago Confirmado!</h2>
          <p style="color:#d1fae5;margin:0;font-size:14px;">Orden #{order.id} · ${float(order.total_amount):.2f} MXN</p>
        </div>

        <!-- Instructions -->
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:20px;margin-bottom:24px;">
          <h3 style="color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Instrucciones</h3>
          <ol style="color:#aaa;font-size:13px;line-height:2;margin:0;padding-left:20px;">
            <li>Guarda este correo o toma captura de pantalla de los códigos QR.</li>
            <li>Preséntalo en la entrada del evento.</li>
            <li>Cada código QR corresponde al bloque o zona indicada (ej: Asientos 1 al 10).</li>
            <li>El personal escaneará tu código para darte acceso a ti y a tus acompañantes.</li>
          </ol>
        </div>

        <!-- QR Tickets -->
        <h3 style="color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">Tus Boletos</h3>
        {items_html}

        <!-- Footer -->
        <div style="text-align:center;padding-top:32px;border-top:1px solid #222;margin-top:32px;">
          <p style="color:#555;font-size:12px;margin:0;">SCW Pro Wrestling · Todos los derechos reservados</p>
          <p style="color:#555;font-size:11px;margin:4px 0 0;">¿Problemas? Responde a este correo.</p>
        </div>
      </div>
    </body>
    </html>
    """

    text_body = f"¡Pago confirmado! Orden #{order.id}. Encuentra tus boletos QR en la versión HTML de este correo."

    config = get_active_config()
    from_email = config.default_from_email if config.default_from_email else settings.DEFAULT_FROM_EMAIL

    email = EmailMultiAlternatives(
        subject=f"🎟️ Tus Boletos SCW – Orden #{order.id}",
        body=text_body,
        from_email=from_email,
        to=[order.contact_email]
    )
    email.mixed_subtype = 'related'
    email.attach_alternative(html_body, "text/html")

    # Attach QR images inline
    for qr in qr_images:
        qr_buf = generate_group_ticket_qr(order.id, qr['group']['item_ids'], qr['group']['title'])
        img = MIMEImage(qr_buf.read(), _subtype='png')
        img.add_header('Content-ID', f"<{qr['cid']}>")
        img.add_header('Content-Disposition', 'inline', filename=f"boletos_{qr['group']['group_id']}.png")
        email.attach(img)

    connection = None
    if config.email_host_user and config.email_host_password:
        connection = get_connection(
            host=config.email_host,
            port=config.email_port,
            username=config.email_host_user,
            password=config.email_host_password,
            use_tls=config.email_use_tls,
        )

    email.connection = connection
    email.send(fail_silently=False)
    return True
