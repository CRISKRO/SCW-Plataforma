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


def get_group_ticket_hash(order_id: int, item_ids: list) -> str:
    """Generate a secure hash for a group of ticket items."""
    secret = settings.SECRET_KEY
    sorted_ids = sorted(item_ids)
    ids_str = ",".join(str(i) for i in sorted_ids)
    raw = f"SCW-GROUP-TICKET-{order_id}-{ids_str}-{secret}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16].upper()


def generate_ticket_qr(order_id: int, item_id: int, item_name: str) -> BytesIO:
    """
    Generate a QR code image for a single ticket.
    Returns a BytesIO object containing the PNG image.
    """
    return generate_group_ticket_qr(order_id, [item_id], item_name)


def generate_group_ticket_qr(order_id: int, item_ids: list, group_title: str) -> BytesIO:
    """
    Generate a QR code image for a group of ticket items.
    Payload contains order, primary item, items list, and group code hash.
    """
    ticket_hash = get_group_ticket_hash(order_id, item_ids)
    primary_item_id = item_ids[0] if item_ids else 0
    payload = json.dumps({
        "scw": True,
        "order": order_id,
        "item": primary_item_id,
        "items": item_ids,
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
            print(f"Failed to add logo to QR: {e}")

    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


def validate_ticket_code(order_id: int, item_id: int, provided_code: str) -> bool:
    """Validate a single or group ticket QR code scanned at the entrance."""
    expected_single = get_ticket_hash(order_id, item_id)
    expected_group = get_group_ticket_hash(order_id, [item_id])
    return provided_code.upper() in (expected_single, expected_group)


def validate_group_ticket_code(order_id: int, item_ids: list, provided_code: str) -> bool:
    """Validate a group ticket QR code scanned at entrance."""
    expected = get_group_ticket_hash(order_id, item_ids)
    if provided_code.upper() == expected:
        return True
    if len(item_ids) == 1:
        return validate_ticket_code(order_id, item_ids[0], provided_code)
    return False


def group_order_items(order):
    """
    Groups ticket items in an order into logical blocks (same area, row, and contiguous/general).
    Returns list of dicts:
      [
        {
          'group_id': 'grp_1',
          'items': [item1, item2, ...],
          'item_ids': [101, 102, ...],
          'title': 'Boleto: SCW MATCH STORY',
          'subtitle': 'Norte · Fila A (Asientos 1 al 5)',
          'quantity': 5,
          'code': 'HASH...'
        }, ...
      ]
    """
    ticket_items = list(order.items.filter(event__isnull=False))
    if not ticket_items:
        return []

    ZONE_NAMES = {
        'NORTE': 'Norte',
        'SUR': 'Sur',
        'ESTE': 'Este',
        'OESTE': 'Oeste',
        'GENERAL': 'General',
    }

    groups_dict = {}

    for item in ticket_items:
        ev_id = item.event_id or 0
        seat = item.seat
        
        if seat and seat.zone:
            z_type = seat.zone.zone_type
            row_name = seat.row_name
            display_num = seat.display_number
        else:
            p_lower = (item.product_name or '').toLowerCase() if hasattr(item.product_name, 'toLowerCase') else (item.product_name or '').lower()
            s_lower = (item.size or '').lower()
            z_type = 'GENERAL'
            row_name = ''
            display_num = None

            # Attempt to parse row_name and seat_number from size if seat FK was null
            if 'fila' in s_lower:
                import re
                row_match = re.search(r'fila\s+([a-z0-9]+)', s_lower, re.IGNORECASE)
                seat_match = re.search(r'asiento\s+(\d+)', s_lower, re.IGNORECASE)
                if row_match:
                    row_name = row_match.group(1).upper()
                if seat_match:
                    display_num = int(seat_match.group(1))

        key = (ev_id, z_type, row_name)
        if key not in groups_dict:
            groups_dict[key] = []
        
        groups_dict[key].append({
            'item': item,
            'seat_number': display_num
        })

    result_groups = []
    group_counter = 1

    for (ev_id, z_type, row_name), item_entries in groups_dict.items():
        valid_seats = [e for e in item_entries if e['seat_number'] is not None]

        items_in_group = [e['item'] for e in item_entries]
        item_ids = [it.id for it in items_in_group]
        total_qty = sum(it.quantity for it in items_in_group)

        event_title = items_in_group[0].event.title if (items_in_group[0].event) else "SCW Pro Wrestling"
        zone_label = ZONE_NAMES.get(z_type, z_type.capitalize())

        if valid_seats:
            valid_seats.sort(key=lambda x: x['seat_number'])
            numbers = [e['seat_number'] for e in valid_seats]
            
            min_num = numbers[0]
            max_num = numbers[-1]
            is_contiguous = (len(numbers) == (max_num - min_num + 1)) and (len(set(numbers)) == len(numbers))

            if len(numbers) == 1:
                seat_str = f"Asiento {numbers[0]}"
            elif is_contiguous:
                seat_str = f"Asientos {min_num} al {max_num}"
            else:
                seat_str = f"Asientos {', '.join(str(n) for n in numbers)}"

            if row_name:
                subtitle = f"{zone_label} · Fila {row_name} ({seat_str})"
            else:
                subtitle = f"{zone_label} ({seat_str})"
        else:
            if z_type == 'GENERAL' or 'general' in zone_label.lower():
                subtitle = f"General ({total_qty} Boleto{'s' if total_qty > 1 else ''})"
            else:
                subtitle = f"{zone_label} ({total_qty} Boleto{'s' if total_qty > 1 else ''})"

        is_cortesia = any('cortesía' in (it.product_name or '').lower() or 'cortesia' in (it.product_name or '').lower() for it in items_in_group)
        prefix = "Boleto CORTESÍA" if is_cortesia else "Boleto"
        group_title = f"{prefix}: {event_title}"

        code_hash = get_group_ticket_hash(order.id, item_ids)

        result_groups.append({
            'group_id': f"grp_{group_counter}",
            'items': items_in_group,
            'item_ids': item_ids,
            'title': group_title,
            'subtitle': subtitle,
            'quantity': total_qty,
            'code': code_hash
        })
        group_counter += 1

    return result_groups
