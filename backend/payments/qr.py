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

    img = qr.make_image(fill_color="#000000", back_color="#FFFFFF")

    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


def validate_ticket_code(order_id: int, item_id: int, provided_code: str) -> bool:
    """Validate a ticket QR code scanned at the entrance."""
    expected = get_ticket_hash(order_id, item_id)
    return provided_code.upper() == expected
