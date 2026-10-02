import re
from django.core.management.base import BaseCommand
from django.db import transaction
from events.models import Event
from payments.models import Order, OrderItem
from tickets.models import EventZone, Seat


# Lista explícita de asientos identificados en la captura de órdenes pagadas
# (Órdenes #4484, #4483, #4482, #4481, #4477, #4476, #4471)
IMAGE_SEATS_PRESET = [
    # Orden 4484 (menesesxavierjorge3@gmail.com)
    {"order_id": 4484, "zone": "SUR", "row": "A", "seat": "38", "client": "menesesxavierjorge3@gmail.com"},
    {"order_id": 4484, "zone": "SUR", "row": "A", "seat": "37", "client": "menesesxavierjorge3@gmail.com"},
    # Orden 4483 (jimmy.salas.ch@gmail.com)
    {"order_id": 4483, "zone": "ESTE", "row": "A", "seat": "19", "client": "jimmy.salas.ch@gmail.com"},
    # Orden 4482 (jimmy.salas.ch@gmail.com)
    {"order_id": 4482, "zone": "ESTE", "row": "A", "seat": "18", "client": "jimmy.salas.ch@gmail.com"},
    # Orden 4481 (alexrtb@gmail.com)
    {"order_id": 4481, "zone": "NORTE", "row": "A", "seat": "8", "client": "alexrtb@gmail.com"},
    {"order_id": 4481, "zone": "NORTE", "row": "A", "seat": "5", "client": "alexrtb@gmail.com"},
    {"order_id": 4481, "zone": "NORTE", "row": "A", "seat": "7", "client": "alexrtb@gmail.com"},
    {"order_id": 4481, "zone": "NORTE", "row": "A", "seat": "6", "client": "alexrtb@gmail.com"},
    # Orden 4477 (marcomorelia.rodriguez@gmail.com)
    {"order_id": 4477, "zone": "OESTE", "row": "A", "seat": "49", "client": "marcomorelia.rodriguez@gmail.com"},
    {"order_id": 4477, "zone": "OESTE", "row": "A", "seat": "50", "client": "marcomorelia.rodriguez@gmail.com"},
    {"order_id": 4477, "zone": "OESTE", "row": "A", "seat": "51", "client": "marcomorelia.rodriguez@gmail.com"},
    {"order_id": 4477, "zone": "OESTE", "row": "A", "seat": "52", "client": "marcomorelia.rodriguez@gmail.com"},
    {"order_id": 4477, "zone": "OESTE", "row": "A", "seat": "53", "client": "marcomorelia.rodriguez@gmail.com"},
    # Orden 4476 (jimmy.salas.ch@gmail.com)
    {"order_id": 4476, "zone": "ESTE", "row": "A", "seat": "21", "client": "jimmy.salas.ch@gmail.com"},
    {"order_id": 4476, "zone": "ESTE", "row": "B", "seat": "20", "client": "jimmy.salas.ch@gmail.com"},
    {"order_id": 4476, "zone": "ESTE", "row": "B", "seat": "22", "client": "jimmy.salas.ch@gmail.com"},
    {"order_id": 4476, "zone": "ESTE", "row": "B", "seat": "21", "client": "jimmy.salas.ch@gmail.com"},
    # Orden 4471 (clonchavez29@hotmail.com)
    {"order_id": 4471, "zone": "ESTE", "row": "A", "seat": "19", "client": "clonchavez29@hotmail.com"},
    {"order_id": 4471, "zone": "ESTE", "row": "A", "seat": "20", "client": "clonchavez29@hotmail.com"},
    {"order_id": 4471, "zone": "ESTE", "row": "A", "seat": "21", "client": "clonchavez29@hotmail.com"},
    {"order_id": 4471, "zone": "SUR", "row": "A", "seat": "29", "client": "clonchavez29@hotmail.com"},
]


def parse_ticket_text(text):
    """
    Extrae zona, fila y número de asiento desde el nombre o snapshot del producto.
    Ejemplo: '1x Boleto: SCW NOCHE DE BRUJAS (Sur - Fila A - Asiento 38)' -> ('SUR', 'A', '38')
    """
    if not text:
        return None

    # Patrón 1: (Zona - Fila X - Asiento Y)
    pattern = re.compile(
        r'(?i)(?P<zone>Norte|Sur|Este|Oeste|Mesas?\s*VIP(?:\s*Ringside)?|Primera\s*Fila|Segunda\s*Fila)'
        r'[^\-]*?-\s*Fila\s*(?P<row>[A-Za-z0-9]+)\s*-\s*Asiento\s*(?P<seat>\d+)'
    )
    m = pattern.search(text)
    if m:
        zone = m.group('zone').strip().upper()
        if 'RINGSIDE' in zone:
            zone = 'MESAS_VIP_RINGSIDE'
        elif 'VIP' in zone:
            zone = 'MESAS_VIP'
        elif 'PRIMERA' in zone:
            zone = 'PRIMERA_FILA'
        elif 'SEGUNDA' in zone:
            zone = 'SEGUNDA_FILA'

        return {
            'zone': zone,
            'row': m.group('row').strip().upper(),
            'seat': m.group('seat').strip(),
        }

    # Patrón 2: Fila X ... Asiento Y con palabra de Zona presente
    pattern_row_seat = re.compile(r'(?i)Fila\s*(?P<row>[A-Za-z0-9]+).*?Asiento\s*(?P<seat>\d+)')
    m_rs = pattern_row_seat.search(text)
    zone_match = re.search(r'(?i)\b(Norte|Sur|Este|Oeste)\b', text)
    if m_rs and zone_match:
        return {
            'zone': zone_match.group(1).upper(),
            'row': m_rs.group('row').strip().upper(),
            'seat': m_rs.group('seat').strip(),
        }

    return None


def find_matching_seat(event, zone_type, row_name, seat_num):
    """
    Busca el asiento correspondiente en las zonas del evento.
    Compara display_number, custom_label y seat_number.
    """
    # Buscar zona compatible
    zone = event.zones.filter(zone_type=zone_type).first()
    if not zone:
        # Intentar coincidencia por nombre
        zone = event.zones.filter(name__icontains=zone_type).first()

    if not zone:
        return None

    seat_num_str = str(seat_num).strip()
    row_upper = str(row_name).strip().upper()

    for s in zone.seats.filter(row_name__iexact=row_upper):
        if (
            str(s.display_number) == seat_num_str
            or str(s.custom_label) == seat_num_str
            or str(s.seat_number) == seat_num_str
        ):
            return s

    return None


class Command(BaseCommand):
    help = (
        'Bloquea los asientos vendidos y revincula las órdenes/QR pagadas '
        'tras regenerar o modificar el mapa de un evento.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'event_id',
            nargs='?',
            type=int,
            default=None,
            help='ID del evento (opcional, si se omite busca el evento por nombre o mapa clásico)',
        )
        parser.add_argument(
            '--event-name',
            type=str,
            default='NOCHE DE BRUJAS',
            help='Texto para buscar el evento por título si no se pasa event_id (por defecto: NOCHE DE BRUJAS)',
        )
        parser.add_argument(
            '--from-image',
            action='store_true',
            default=True,
            help='Aplica la lista de asientos de la captura (#4484, #4483, #4482, #4481, #4477, #4476, #4471)',
        )
        parser.add_argument(
            '--scan-orders',
            action='store_true',
            default=True,
            help='Escanea la base de datos buscando todas las órdenes pagadas con boletos para este evento',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué asientos se bloquearían y vincularían sin guardar cambios en la base de datos',
        )

    def handle(self, *args, **options):
        event_id = options.get('event_id')
        event_name = options.get('event_name', 'NOCHE DE BRUJAS')
        dry_run = options.get('dry_run', False)

        # 1. Encontrar el evento
        event = None
        if event_id:
            try:
                event = Event.objects.get(id=event_id)
            except Event.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'No se encontró el evento con ID {event_id}'))
                return
        else:
            # Buscar por nombre o por map_type
            event = (
                Event.objects.filter(title__icontains=event_name).first()
                or Event.objects.filter(map_type='CLASSIC_RING').first()
                or Event.objects.order_by('-id').first()
            )

        if not event:
            self.stderr.write(self.style.ERROR('No se encontró ningún evento en la base de datos.'))
            return

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"\n=== RESTAURANDO Y BLOQUEANDO ASIENTOS VENDIDOS PARA EVENTO #{event.id}: {event.title} ==="
            )
        )
        if dry_run:
            self.stdout.write(self.style.WARNING("MODO DE PRUEBA (--dry-run): No se guardarán cambios en la BD.\n"))

        blocked_count = 0
        relinked_count = 0
        already_blocked = 0
        seats_blocked_set = set()

        # 2. Paso A: Escanear órdenes pagadas en la base de datos que contengan boletos
        self.stdout.write("1. Escaneando órdenes pagadas en la base de datos...")
        paid_orders = Order.objects.filter(status=Order.Status.PAID).order_by('id')
        
        for order in paid_orders:
            for item in order.items.all():
                text_to_check = f"{item.product_name} {item.size}"
                info = parse_ticket_text(text_to_check)
                if not info:
                    continue

                seat = find_matching_seat(event, info['zone'], info['row'], info['seat'])
                if not seat:
                    continue

                seats_blocked_set.add(seat.id)
                needs_seat_update = False
                needs_item_update = False

                if seat.is_available:
                    needs_seat_update = True
                    blocked_count += 1
                else:
                    already_blocked += 1

                if item.seat_id != seat.id or item.event_id != event.id:
                    needs_item_update = True
                    relinked_count += 1

                status_label = "BLOQUEADO Y VINCULADO" if (needs_seat_update or needs_item_update) else "YA ALINEADO"
                self.stdout.write(
                    f"  [OK] Orden #{order.id} ({order.contact_email}): "
                    f"Zona {info['zone']} Fila {info['row']} Asiento #{info['seat']} (Seat ID: {seat.id}) -> [{status_label}]"
                )

                if not dry_run:
                    if needs_seat_update:
                        seat.is_available = False
                        seat.save(update_fields=['is_available'])
                    if needs_item_update:
                        item.seat = seat
                        item.event = event
                        item.save(update_fields=['seat', 'event'])

        # 3. Paso B: Asegurar que todos los asientos de la captura queden bloqueados y vinculados
        self.stdout.write(
            "\n2. Verificando y aplicando lista explícita de asientos de la captura (Órdenes #4484 a #4471)..."
        )
        for entry in IMAGE_SEATS_PRESET:
            seat = find_matching_seat(event, entry['zone'], entry['row'], entry['seat'])
            if not seat:
                self.stdout.write(
                    self.style.WARNING(
                        f"  [!] No se encontró el asiento en el mapa: Zona {entry['zone']} Fila {entry['row']} Asiento #{entry['seat']}"
                    )
                )
                continue

            # Buscar si existe la orden en la BD
            order_item = OrderItem.objects.filter(
                order_id=entry['order_id']
            ).filter(
                product_name__icontains=f"Asiento {entry['seat']}"
            ).first()

            if not order_item:
                # Intentar buscar por orden solamente
                order_item = OrderItem.objects.filter(order_id=entry['order_id']).first()

            was_available = seat.is_available
            if seat.id not in seats_blocked_set:
                seats_blocked_set.add(seat.id)
                if was_available:
                    blocked_count += 1
                else:
                    already_blocked += 1

            if not dry_run:
                if was_available:
                    seat.is_available = False
                    seat.save(update_fields=['is_available'])

                if order_item and order_item.seat_id != seat.id:
                    order_item.seat = seat
                    order_item.event = event
                    order_item.save(update_fields=['seat', 'event'])
                    relinked_count += 1

            action_desc = "BLOQUEADO" if was_available else "YA ESTABA BLOQUEADO"
            order_str = f"Orden #{entry['order_id']}" if order_item else f"Orden #{entry['order_id']} (Ref externa)"
            self.stdout.write(
                f"  [OK] {order_str} ({entry['client']}): "
                f"Zona {entry['zone']} Fila {entry['row']} Asiento #{entry['seat']} (Seat ID: {seat.id}) -> {action_desc}"
            )

        # 4. Resumen final
        self.stdout.write(
            self.style.SUCCESS(
                f"\n¡Operación finalizada con éxito!"
                f"\n  - Evento: #{event.id} ({event.title})"
                f"\n  - Asientos únicos bloqueados para la venta: {len(seats_blocked_set)}"
                f"\n  - Asientos cambiados a no disponible (is_available=False): {blocked_count}"
                f"\n  - Asientos que ya estaban bloqueados previamente: {already_blocked}"
                f"\n  - Boletos (OrderItem / QR) revinculados a los asientos del mapa: {relinked_count}\n"
            )
        )
