"""
QR code generation for SCW tickets.
Each ticket gets a signed QR code that can be scanned at the event entrance.
"""
import qrcode
import hashlib
import json
import os
from io import BytesIO
from django.conf import settings
from PIL import Image


def get_ticket_hash(order_id: int, item_id: int) -> str:
    """Generate a secure hash for ticket validation."""
    secret = settings.SECRET_KEY
    raw = f"SCW-TICKET-{order_id}-{item_id}-{secret}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16].upper()


def generate_ticket_qr(order_id: int, item_id: int, item_name: str) -> BytesIO:
    """
    Generate a QR code image for a ticket.
    Returns a BytesIO object containing the PNG image.
    """
    ticket_hash = get_ticket_hash(order_id, item_id)
    payload = json.dumps({
        "scw": True,
        "order": order_id,
        "item": item_id,
        "code": ticket_hash
    })

    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#000000", back_color="#FFFFFF").convert('RGB')
    
    # Add logo to the center of the QR code
    logo_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'images', 'logo-scw.png')
    
    if os.path.exists(logo_path):
        try:
            logo = Image.open(logo_path)
            qr_width, qr_height = img.size
            logo_size = int(qr_width * 0.35) 
            logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            
            pos = ((qr_width - logo_size) // 2, (qr_height - logo_size) // 2)
            
            logo_bg = Image.new('RGB', (logo_size, logo_size), 'white')
            if 'A' in logo.getbands():
                logo_bg.paste(logo, (0,0), mask=logo)
            else:
                logo_bg.paste(logo, (0,0))
                
            img.paste(logo_bg, pos)
        except Exception as e:
            # Fallback to normal QR if logo fails
            print(f"Failed to add logo to QR: {e}")

    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


def validate_ticket_code(order_id: int, item_id: int, provided_code: str) -> bool:
    """Validate a ticket QR code scanned at the entrance."""
    expected = get_ticket_hash(order_id, item_id)
    return provided_code.upper() == expected
