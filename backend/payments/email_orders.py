"""
Email sending for SCW merch orders.
Sends a beautiful HTML email receipt or status updates.
"""
from django.core.mail import EmailMultiAlternatives, get_connection
from django.conf import settings
from api.models import get_active_config

def get_status_display_text(status_code):
    status_map = {
        'PENDING': 'Pendiente de pago',
        'PAID': 'Pagado / En preparación',
        'PROCESSING': 'Preparando envío',
        'SHIPPED': 'Enviado',
        'DELIVERED': 'Entregado',
        'CANCELLED': 'Cancelado'
    }
    return status_map.get(status_code, status_code)

def send_order_receipt_email(order):
    """
    Send a purchase receipt for merch (physical items) and summarize the whole order.
    """
    items = order.items.all()
    
    if not items.exists():
        return False
        
    try:
        has_tickets = items.filter(product_name__icontains='Boleto').exists() or items.filter(product_name__icontains='Entrada').exists()
    except Exception:
        has_tickets = False
        
    items_html = ""
    for item in items:
        size_str = item.size if item.size else ""
        size_html = f'<p style="color:#888;font-size:13px;margin:0;">Talla/Asiento: {size_str}</p>' if size_str else ""
        
        price_val = float(item.price or 0)
        qty_val = float(item.quantity or 1)
        total_item_price = price_val * qty_val
        
        items_html += f"""
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
          <div>
              <h3 style="color:#fff;margin:0 0 4px;font-size:16px;">{int(qty_val)}x {item.product_name}</h3>
              {size_html}
          </div>
          <p style="color:#fff;font-size:16px;font-weight:bold;margin:0;">${total_item_price:.2f}</p>
        </div>
        """

    tickets_note = '<p style="color:#10b981;font-size:14px;font-weight:bold;line-height:1.6;margin:12px 0 0;">🎟️ Si compraste boletos, estos se enviaron en un correo por separado con sus códigos QR.</p>' if has_tickets else ""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#000;font-family:'Helvetica Neue',Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        
        <!-- Header -->
        <div style="text-align:center;margin-bottom:40px;">
          <h1 style="color:#fff;font-size:32px;font-weight:900;letter-spacing:-1px;margin:0;text-transform:uppercase;">SCW</h1>
          <p style="color:#e00;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:4px 0 0;">Recibo de Compra</p>
        </div>

        <!-- Confirmation Banner -->
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:16px;padding:24px;text-align:center;margin-bottom:32px;">
          <p style="font-size:32px;margin:0;">✅</p>
          <h2 style="color:#fff;font-size:24px;font-weight:900;margin:8px 0 4px;">¡Compra Confirmada!</h2>
          <p style="color:#d1fae5;margin:0;font-size:14px;">Orden #{order.id}</p>
        </div>

        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="color:#aaa;font-size:14px;line-height:1.6;margin:0;">
            Hemos recibido tu pago exitosamente. Ya estamos procesando tu pedido y te notificaremos en cuanto haya actualizaciones.
          </p>
          {tickets_note}
        </div>

        <!-- Items -->
        <h3 style="color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">Detalle de la compra</h3>
        {items_html}
        
        <div style="display:flex;justify-content:space-between;border-top:1px solid #333;padding-top:16px;margin-top:8px;">
            <span style="color:#aaa;font-weight:bold;text-transform:uppercase;">Envío</span>
            <span style="color:#fff;font-weight:bold;font-size:16px;">${float(order.shipping_cost or 0):.2f} MXN</span>
        </div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid #333;padding-top:16px;margin-top:8px;">
            <span style="color:#aaa;font-weight:bold;text-transform:uppercase;">Total</span>
            <span style="color:#fff;font-weight:bold;font-size:18px;">${float(order.total_amount or 0):.2f} MXN</span>
        </div>

        <!-- Footer -->
        <div style="text-align:center;padding-top:32px;border-top:1px solid #222;margin-top:32px;">
          <p style="color:#555;font-size:12px;margin:0;">SCW Pro Wrestling · Tienda Oficial</p>
          <p style="color:#555;font-size:11px;margin:4px 0 0;">¿Dudas sobre tu pedido? Responde a este correo.</p>
        </div>
      </div>
    </body>
    </html>
    """

    text_body = f"¡Compra confirmada! Orden #{order.id}. Ya estamos procesando tu pedido."

    config = get_active_config()
    from_email = config.default_from_email if config.default_from_email else settings.DEFAULT_FROM_EMAIL

    email = EmailMultiAlternatives(
        subject=f"📦 SCW Tienda – Confirmación de Orden #{order.id}",
        body=text_body,
        from_email=from_email,
        to=[order.contact_email]
    )
    email.attach_alternative(html_body, "text/html")

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


def send_status_update_email(order):
    """
    Send an email notifying the customer about an order status change.
    """
    status_text = get_status_display_text(order.status)
    
    # Custom message based on status
    if order.status == 'PROCESSING':
        msg = "Estamos preparando tu pedido. Pronto te notificaremos cuando esté en camino."
        icon = "⏳"
        color_start = "#d97706" # amber
        color_end = "#b45309"
    elif order.status == 'SHIPPED':
        msg = "¡Buenas noticias! Tu pedido ya está en camino hacia tu destino."
        icon = "🚚"
        color_start = "#2563eb" # blue
        color_end = "#1d4ed8"
    elif order.status == 'DELIVERED':
        msg = "Tu pedido ha sido entregado exitosamente. ¡Esperamos que lo disfrutes!"
        icon = "🎉"
        color_start = "#16a34a" # green
        color_end = "#15803d"
    elif order.status == 'CANCELLED':
        msg = "Lamentamos informarte que tu pedido ha sido cancelado."
        icon = "❌"
        color_start = "#dc2626" # red
        color_end = "#b91c1c"
    else:
        msg = "El estado de tu pedido ha sido actualizado."
        icon = "📦"
        color_start = "#4b5563" # grey
        color_end = "#374151"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#000;font-family:'Helvetica Neue',Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        
        <div style="text-align:center;margin-bottom:40px;">
          <h1 style="color:#fff;font-size:32px;font-weight:900;letter-spacing:-1px;margin:0;text-transform:uppercase;">SCW</h1>
          <p style="color:#e00;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:4px 0 0;">Tienda Oficial</p>
        </div>

        <div style="background:linear-gradient(135deg,{color_start},{color_end});border-radius:16px;padding:24px;text-align:center;margin-bottom:32px;">
          <p style="font-size:32px;margin:0;">{icon}</p>
          <h2 style="color:#fff;font-size:24px;font-weight:900;margin:8px 0 4px;">{status_text}</h2>
          <p style="color:#f3f4f6;margin:0;font-size:14px;">Orden #{order.id}</p>
        </div>

        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="color:#aaa;font-size:14px;line-height:1.6;margin:0;text-align:center;">
            {msg}
          </p>
        </div>

        <div style="text-align:center;padding-top:32px;border-top:1px solid #222;margin-top:32px;">
          <p style="color:#555;font-size:12px;margin:0;">SCW Pro Wrestling · Tienda Oficial</p>
          <p style="color:#555;font-size:11px;margin:4px 0 0;">¿Dudas sobre tu pedido? Responde a este correo.</p>
        </div>
      </div>
    </body>
    </html>
    """

    text_body = f"Actualización de Orden #{order.id}: {status_text}. {msg}"

    config = get_active_config()
    from_email = config.default_from_email if config.default_from_email else settings.DEFAULT_FROM_EMAIL

    email = EmailMultiAlternatives(
        subject=f"📦 Actualización de tu pedido SCW – Orden #{order.id}",
        body=text_body,
        from_email=from_email,
        to=[order.contact_email]
    )
    email.attach_alternative(html_body, "text/html")

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
