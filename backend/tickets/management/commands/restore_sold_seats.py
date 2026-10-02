from django.core.management.base import BaseCommand
from django.db import transaction
from events.models import Event
from payments.models import Order, OrderItem
from tickets.models import EventZone, Seat

# Lista EXACTA Y ÚNICA de los boletos vendidos que aparecen en la captura:
# Órdenes: #4484, #4483, #4482, #4481, #4477, #4476, #4471
ONLY_IMAGE_SEATS = [
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


def find_matching_seat(event, zone_type, row_name, seat_num):
    zone = event.zones.filter(zone_type=zone_type).first()
    if not zone:
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
        'Restaura la disponibilidad de TODOS los asientos y bloquea ÚNICAMENTE '
        'los 19 asientos de las órdenes vendidas en la captura.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'event_id',
            nargs='?',
            type=int,
            default=None,
            help='ID del evento (opcional, si se omite busca NOCHE DE BRUJAS o el último creado)',
        )
        parser.add_argument(
            '--event-name',
            type=str,
            default='NOCHE DE BRUJAS',
            help='Título del evento a buscar si no se especifica ID',
        )

    def handle(self, *args, **options):
        event_id = options.get('event_id')
        event_name = options.get('event_name', 'NOCHE DE BRUJAS')

        event = None
        if event_id:
            try:
                event = Event.objects.get(id=event_id)
            except Event.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'No se encontró el evento con ID {event_id}.'))
                self.stderr.write('Eventos registrados en la base de datos:')
                for e in Event.objects.all():
                    self.stderr.write(f'  - ID {e.id}: {e.title}')
                return
        else:
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
                f"\n=== CORRIGIENDO DISPONIBILIDAD PARA EVENTO #{event.id}: {event.title} ==="
            )
        )

        with transaction.atomic():
            # 1. PASO CLAVE: Desbloquear TODOS los asientos del evento (ponerlos todos disponibles)
            total_seats = Seat.objects.filter(zone__event=event).count()
            Seat.objects.filter(zone__event=event).update(is_available=True)
            self.stdout.write(
                f"1. Se resetearon a DISPONIBLES todos los {total_seats} asientos del evento #{event.id}."
            )

            # 2. Desvincular cualquier OrderItem ajeno que se haya asociado por error
            OrderItem.objects.filter(seat__zone__event=event).update(seat=None)

            # 3. Bloquear ÚNICAMENTE los asientos específicos de la captura
            self.stdout.write("2. Bloqueando ÚNICAMENTE los 19 asientos de la captura...")
            blocked_seats = set()
            relinked_orders = 0

            for entry in ONLY_IMAGE_SEATS:
                seat = find_matching_seat(event, entry['zone'], entry['row'], entry['seat'])
                if not seat:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  [!] No se localizó en el mapa: Zona {entry['zone']} Fila {entry['row']} Asiento #{entry['seat']}"
                        )
                    )
                    continue

                # Marcar como NO disponible
                seat.is_available = False
                seat.save(update_fields=['is_available'])
                blocked_seats.add(seat.id)

                # Revincular el OrderItem si la orden existe en la BD
                order_item = OrderItem.objects.filter(
                    order_id=entry['order_id']
                ).filter(
                    product_name__icontains=f"Asiento {entry['seat']}"
                ).first()

                if not order_item:
                    order_item = OrderItem.objects.filter(order_id=entry['order_id']).first()

                if order_item:
                    order_item.seat = seat
                    order_item.event = event
                    order_item.save(update_fields=['seat', 'event'])
                    relinked_orders += 1

                self.stdout.write(
                    f"  [OK] Orden #{entry['order_id']} ({entry['client']}): "
                    f"Zona {entry['zone']} Fila {entry['row']} Asiento #{entry['seat']} -> BLOQUEADO (NO DISPONIBLE)"
                )

        remaining_available = total_seats - len(blocked_seats)
        self.stdout.write(
            self.style.SUCCESS(
                f"\n¡CORRECCIÓN COMPLETADA CON ÉXITO!"
                f"\n  - Evento: #{event.id} ({event.title})"
                f"\n  - Total de asientos en el mapa: {total_seats}"
                f"\n  - Asientos bloqueados (vendidos): {len(blocked_seats)} (Únicamente los de la imagen)"
                f"\n  - Asientos que ahora están LIBRES / DISPONIBLES: {remaining_available}"
                f"\n  - Órdenes vinculadas a los asientos del mapa: {relinked_orders}\n"
            )
        )
