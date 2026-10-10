"""
Email sending for SCW ticket confirmation.
Sends a beautiful, modern HTML email with company logos and QR codes attached for each purchased item.
"""
import base64
import os
from email.mime.image import MIMEImage
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from .qr import generate_ticket_qr
from api.models import get_active_config
from .utils import ensure_ticket_items_expanded


def send_ticket_email(order):
    """
    Send a ticket confirmation email with an individual QR code per seat / ticket.
    """
    ensure_ticket_items_expanded(order)
    ticket_items = list(order.items.filter(event__isnull=False))
    
    if not ticket_items:
        return False

    total_tickets = len(ticket_items)

    # Check for logo candidates
    logo_candidates = [
        os.path.join(settings.BASE_DIR, 'media', 'logo-scw.png'),
        os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'images', 'logo-scw.png'),
        os.path.join(settings.BASE_DIR, 'media', 'fighters', 'logo_scw.jpg'),
    ]
    logo_path = None
    for p in logo_candidates:
        if os.path.exists(p):
            logo_path = p
            break

    # Build QR attachments
    qr_images = []
    items_html = ""
    for idx, item in enumerate(ticket_items, 1):
        title = item.product_name if item.product_name else (item.event.title if item.event else "Boleto SCW")
        
        if item.seat and item.seat.zone:
            seat_info = f"{item.seat.zone.get_zone_type_display()} · Fila {item.seat.row_name} · Asiento {item.seat.display_number}"
        elif item.size:
            seat_info = item.size
        else:
            seat_info = "Entrada General"

        if hasattr(item, 'valid_for_day') and item.valid_for_day != 'ALL':
            day_text = item.get_valid_day_label() if hasattr(item, 'get_valid_day_label') else item.get_valid_for_day_display()
            if day_text:
                seat_info += f" · ({day_text})"

        badge_text = f"Boleto {idx} de {total_tickets}" if total_tickets > 1 else "1 Boleto"

        qr_buf = generate_ticket_qr(order.id, item.id, title)
        qr_b64 = base64.b64encode(qr_buf.read()).decode()
        cid_str = f"qr_item_{item.id}@scw.boletos"
        qr_images.append({
            'item': item,
            'title': title,
            'seat_info': seat_info,
            'b64': qr_b64,
            'cid': cid_str
        })
        
        items_html += f"""
        <div style="background:#111216;border:1px solid #24252e;border-radius:16px;padding:24px 20px;margin-bottom:24px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
          <p style="color:#dc2626;font-size:10px;text-transform:uppercase;letter-spacing:2.5px;margin:0 0 6px;font-weight:900;">
            &#9733; BOLETO OFICIAL &nbsp;·&nbsp; {badge_text.upper()} &#9733;
          </p>
          <h3 style="color:#ffffff;margin:0 0 8px;font-size:20px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;">
            {title}
          </h3>
          <div style="display:inline-block;background:#181920;border:1px solid #2e303d;border-radius:20px;padding:5px 14px;margin-bottom:18px;">
            <span style="color:#22c55e;font-size:12px;font-weight:bold;letter-spacing:0.5px;">{seat_info}</span>
          </div>
          <div style="background:#ffffff;padding:12px;border-radius:12px;display:inline-block;margin:0 auto;box-shadow:0 4px 16px rgba(0,0,0,0.4);">
            <img src="cid:{cid_str}" width="220" height="220" alt="QR Boleto" style="display:block;border-radius:4px;"/>
          </div>
          <p style="color:#888890;font-size:11px;margin:14px 0 2px;">
            Presenta este código en la entrada (Válido para 1 acceso)
          </p>
          <p style="color:#52525b;font-size:10px;font-family:'Courier New',Courier,monospace;letter-spacing:1px;margin:2px 0 0;">
            FOLIO DIGITAL: #SCW-ORD{order.id}-ITM{item.id}
          </p>
        </div>
        """

    logo_img_tag = '<div style="text-align:center;margin-bottom:12px;"><img src="cid:logo_scw@scw.boletos" width="68" height="68" alt="SCW" style="display:inline-block;border-radius:50%;border:2px solid rgba(255,255,255,0.15);background:#000000;" /></div>' if logo_path else ''

    html_body = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Boletos SCW</title>
    </head>
    <body style="margin:0;padding:0;background:#090a0d;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
      <div style="max-width:580px;margin:0 auto;padding:36px 18px;">
        
        <!-- Header con Logo Oficial -->
        <div style="text-align:center;margin-bottom:30px;padding-bottom:24px;border-bottom:1px solid #1e2028;">
          {logo_img_tag}
          <h1 style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:1px;margin:0;text-transform:uppercase;">STRONG CLASSIC WRESTLING</h1>
          <p style="color:#dc2626;font-size:10px;font-weight:900;letter-spacing:3px;text-transform:uppercase;margin:4px 0 0;">BOLETERÍA OFICIAL · THE WRESTLING FACTORY</p>
        </div>

        <!-- Banner de Confirmación (Elegante y Moderno, Sin Emojis) -->
        <div style="background:linear-gradient(145deg,#0d1f14,#0a140e);border:1px solid rgba(34,197,94,0.3);border-radius:14px;padding:20px 24px;text-align:center;margin-bottom:28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 8px;">
            <tr>
              <td style="width:26px;height:26px;border-radius:50%;background:rgba(34,197,94,0.15);border:1.5px solid #22c55e;text-align:center;vertical-align:middle;color:#22c55e;font-size:15px;font-weight:900;line-height:26px;">
                &#10003;
              </td>
              <td style="padding-left:10px;color:#ffffff;font-size:17px;font-weight:900;letter-spacing:1px;text-transform:uppercase;vertical-align:middle;">
                PAGO CONFIRMADO
              </td>
            </tr>
          </table>
          <p style="color:#a1a1aa;margin:0;font-size:13px;font-family:'Courier New',Courier,monospace;letter-spacing:0.5px;">
            Orden #{order.id} &nbsp;·&nbsp; ${float(order.total_amount):.2f} MXN &nbsp;·&nbsp; <span style="color:#22c55e;font-weight:bold;">Aprobado</span>
          </p>
        </div>

        <!-- Instrucciones de Acceso -->
        <div style="background:#111216;border:1px solid #22232a;border-radius:14px;padding:20px 24px;margin-bottom:28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
            <tr>
              <td style="width:4px;height:16px;background:#dc2626;border-radius:2px;"></td>
              <td style="padding-left:8px;color:#ffffff;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">
                INSTRUCCIONES DE ACCESO
              </td>
            </tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="vertical-align:top;width:24px;padding-bottom:10px;">
                <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;background:#1a1b22;border:1px solid #2e303d;border-radius:4px;color:#d4d4d8;font-size:10px;font-weight:bold;font-family:monospace;">1</span>
              </td>
              <td style="color:#a1a1aa;font-size:12px;line-height:1.6;padding-bottom:10px;padding-left:6px;">
                Guarda este correo o toma captura de pantalla de cada código QR en tu teléfono.
              </td>
            </tr>
            <tr>
              <td style="vertical-align:top;width:24px;padding-bottom:10px;">
                <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;background:#1a1b22;border:1px solid #2e303d;border-radius:4px;color:#d4d4d8;font-size:10px;font-weight:bold;font-family:monospace;">2</span>
              </td>
              <td style="color:#a1a1aa;font-size:12px;line-height:1.6;padding-bottom:10px;padding-left:6px;">
                Cada código QR es único y corresponde a un asiento o entrada individual.
              </td>
            </tr>
            <tr>
              <td style="vertical-align:top;width:24px;padding-bottom:10px;">
                <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;background:#1a1b22;border:1px solid #2e303d;border-radius:4px;color:#d4d4d8;font-size:10px;font-weight:bold;font-family:monospace;">3</span>
              </td>
              <td style="color:#a1a1aa;font-size:12px;line-height:1.6;padding-bottom:10px;padding-left:6px;">
                Preséntalo directamente en la entrada de <strong style="color:#ffffff;">The Wrestling Factory</strong>.
              </td>
            </tr>
            <tr>
              <td style="vertical-align:top;width:24px;">
                <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;background:#1a1b22;border:1px solid #2e303d;border-radius:4px;color:#d4d4d8;font-size:10px;font-weight:bold;font-family:monospace;">4</span>
              </td>
              <td style="color:#a1a1aa;font-size:12px;line-height:1.6;padding-left:6px;">
                El personal escaneará tu código para darte acceso inmediato a ti y a tus acompañantes.
              </td>
            </tr>
          </table>
        </div>

        <!-- Boletos QR -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
          <tr>
            <td style="width:4px;height:16px;background:#dc2626;border-radius:2px;"></td>
            <td style="padding-left:8px;color:#ffffff;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">
              TUS BOLETOS DIGITALES
            </td>
          </tr>
        </table>
        {items_html}

        <!-- Footer -->
        <div style="text-align:center;padding-top:28px;border-top:1px solid #1e2028;margin-top:28px;">
          <p style="color:#71717a;font-size:11px;font-weight:bold;margin:0;letter-spacing:0.5px;">
            Strong Classic Wrestling &nbsp;·&nbsp; The Wrestling Factory
          </p>
          <p style="color:#52525b;font-size:11px;margin:6px 0 0;">
            ¿Tienes alguna duda con tu compra? Responde directamente a este correo.
          </p>
          <p style="color:#3f3f46;font-size:10px;margin:6px 0 0;">
            Comprobante electrónico de acceso oficial. No compartas tus códigos QR con terceros.
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    text_body = f"Pago confirmado. Orden #{order.id}. Encuentra tus boletos QR en la versión HTML de este correo."

    config = get_active_config()
    from_email = config.default_from_email if config.default_from_email else settings.DEFAULT_FROM_EMAIL

    email = EmailMultiAlternatives(
        subject=f"Tus Boletos SCW – Orden #{order.id}",
        body=text_body,
        from_email=from_email,
        to=[order.contact_email]
    )
    email.mixed_subtype = 'related'
    email.attach_alternative(html_body, "text/html")

    # Attach SCW Logo if available
    if logo_path:
        try:
            with open(logo_path, 'rb') as f:
                logo_mime = MIMEImage(f.read(), _subtype='png' if logo_path.endswith('.png') else 'jpeg')
                logo_mime.add_header('Content-ID', '<logo_scw@scw.boletos>')
                logo_mime.add_header('Content-Disposition', 'inline', filename='logo_scw.png')
                email.attach(logo_mime)
        except Exception as e:
            print(f"Error attaching logo to email: {e}")

    # Attach QR images inline
    for qr in qr_images:
        qr_buf = generate_ticket_qr(order.id, qr['item'].id, qr['title'])
        img = MIMEImage(qr_buf.read(), _subtype='png')
        img.add_header('Content-ID', f"<{qr['cid']}>")
        img.add_header('Content-Disposition', 'inline', filename=f"boleto_{qr['item'].id}.png")
        email.attach(img)

    from .utils import get_smtp_connection
    connection = get_smtp_connection(config)

    email.connection = connection
    email.send(fail_silently=False)
    return True
