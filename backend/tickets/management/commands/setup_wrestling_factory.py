from django.core.management.base import BaseCommand
from django.db import transaction
from events.models import Event
from tickets.models import EventZone, Seat


class Command(BaseCommand):
    help = (
        'Aplica la plantilla tradicional The Wrestling Factory '
        '(Ring Clásico SCW: Zonas Norte, Sur, Este, Oeste y General) a uno o todos los eventos'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'event_id',
            nargs='?',
            type=int,
            default=None,
            help='ID del evento al que aplicar la plantilla (opcional, si se omite usa el último evento clásico o el último creado)'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Aplicar a todos los eventos registrados'
        )
        parser.add_argument(
            '--price',
            type=str,
            default='320.00',
            help='Precio base general para las 4 zonas cardinales (Norte, Sur, Este, Oeste). Por defecto: 320.00'
        )
        parser.add_argument(
            '--norte',
            type=str,
            default=None,
            help='Precio específico Zona Norte (por defecto toma el valor de --price)'
        )
        parser.add_argument(
            '--sur',
            type=str,
            default=None,
            help='Precio específico Zona Sur (por defecto toma el valor de --price)'
        )
        parser.add_argument(
            '--este',
            type=str,
            default=None,
            help='Precio específico Zona Este (por defecto toma el valor de --price)'
        )
        parser.add_argument(
            '--oeste',
            type=str,
            default=None,
            help='Precio específico Zona Oeste (por defecto toma el valor de --price)'
        )
        parser.add_argument(
            '--general',
            type=str,
            default='200.00',
            help='Precio Zona General. Por defecto: 200.00'
        )
        parser.add_argument(
            '--abono-asiento',
            type=str,
            default=None,
            help='Precio especial de abono para 2 días en asientos numerados (opcional)'
        )
        parser.add_argument(
            '--abono-general',
            type=str,
            default=None,
            help='Precio especial de abono para 2 días en zona General (opcional)'
        )
        parser.add_argument(
            '--rows',
            type=int,
            default=2,
            help='Cantidad de filas por zona cardinal (por defecto 2: Fila A y Fila B)'
        )
        parser.add_argument(
            '--seats-norte',
            type=int,
            default=17,
            help='Cantidad de asientos por fila en Zona Norte (por defecto: 17)'
        )
        parser.add_argument(
            '--seats-sur',
            type=int,
            default=17,
            help='Cantidad de asientos por fila en Zona Sur (por defecto: 17)'
        )
        parser.add_argument(
            '--seats-este',
            type=int,
            default=10,
            help='Cantidad de asientos por fila en Zona Este (por defecto: 10)'
        )
        parser.add_argument(
            '--seats-oeste',
            type=int,
            default=16,
            help='Cantidad de asientos por fila en Zona Oeste (por defecto: 16)'
        )

    def handle(self, *args, **options):
        event_id = options.get('event_id')
        apply_all = options.get('all', False)

        if apply_all:
            events = Event.objects.all()
        elif event_id:
            try:
                events = [Event.objects.get(id=event_id)]
            except Event.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'No se encontró el evento con ID {event_id}'))
                return
        else:
            # Si no especifica, buscar evento con map_type CLASSIC_RING, o evento 2, o el último creado
            ev = (
                Event.objects.filter(map_type='CLASSIC_RING').first()
                or Event.objects.filter(id=2).first()
                or Event.objects.order_by('-id').first()
            )
            if not ev:
                self.stderr.write(self.style.ERROR('No hay eventos registrados en la base de datos.'))
                return
            events = [ev]

        base_price = options.get('price', '320.00')
        price_norte = options.get('norte') or base_price
        price_sur = options.get('sur') or base_price
        price_este = options.get('este') or base_price
        price_oeste = options.get('oeste') or base_price
        price_general = options.get('general', '200.00')

        abono_asiento = options.get('abono_asiento')
        abono_general = options.get('abono_general')
        rows_count = options.get('rows', 2)

        seats_norte = options.get('seats_norte', 17)
        seats_sur = options.get('seats_sur', 17)
        seats_este = options.get('seats_este', 10)
        seats_oeste = options.get('seats_oeste', 16)

        zone_configs = [
            (EventZone.ZoneType.NORTE, 'Zona Norte', '#ef4444', price_norte, abono_asiento, rows_count, seats_norte),
            (EventZone.ZoneType.SUR, 'Zona Sur', '#ef4444', price_sur, abono_asiento, rows_count, seats_sur),
            (EventZone.ZoneType.ESTE, 'Zona Este', '#ef4444', price_este, abono_asiento, rows_count, seats_este),
            (EventZone.ZoneType.OESTE, 'Zona Oeste', '#ef4444', price_oeste, abono_asiento, rows_count, seats_oeste),
            (EventZone.ZoneType.GENERAL, 'General', '#064e3b', price_general, abono_general, 0, 0),
        ]

        for event in events:
            self.stdout.write(
                f'Configurando plantilla The Wrestling Factory para el Evento #{event.id}: {event.title}...'
            )
            with transaction.atomic():
                # 1. Limpiar zonas actuales del evento
                EventZone.objects.filter(event=event).delete()

                # 2. Asignar configuración de mapa tradicional The Wrestling Factory
                event.map_type = 'CLASSIC_RING'
                if not event.location or event.location in [
                    'Labrú',
                    'The Wrestling Factory',
                    'Arena Metropolitana SCW',
                    'Gimnasio Municipal SCW',
                    '',
                ]:
                    event.location = 'The Wrestling Factory'
                event.map_config = {}
                event.save(update_fields=['map_type', 'map_config', 'location'])

                # 3. Crear las zonas y sus asientos
                for zt, name, color, price, abono, rows, seats_per_row in zone_configs:
                    z = EventZone.objects.create(
                        event=event,
                        zone_type=zt,
                        name=name,
                        color=color,
                        price=price,
                        price_abono=abono,
                        rows=rows,
                        seats_per_row=seats_per_row,
                    )

                    # EventZone.save() auto-genera los asientos si rows > 0 y seats_per_row > 0.
                    # Aseguramos que existan y asignamos custom_label para máxima compatibilidad con el mapa:
                    if rows > 0 and seats_per_row > 0:
                        seats = list(z.seats.all())
                        if not seats:
                            letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                            created_seats = []
                            for r in range(rows):
                                row_name = letters[r] if r < len(letters) else str(r + 1)
                                for s in range(1, seats_per_row + 1):
                                    created_seats.append(
                                        Seat(
                                            zone=z,
                                            row_name=row_name,
                                            seat_number=s,
                                        )
                                    )
                            Seat.objects.bulk_create(created_seats)
                            seats = list(z.seats.all())

                        # Asignar custom_label con el display_number (1-60) para cada asiento
                        seats_to_update = []
                        for seat in seats:
                            calculated_label = str(seat.display_number)
                            if seat.custom_label != calculated_label:
                                seat.custom_label = calculated_label
                                seats_to_update.append(seat)

                        if seats_to_update:
                            Seat.objects.bulk_update(seats_to_update, ['custom_label'])

            total_seats = sum(z.seats.count() for z in event.zones.all())
            self.stdout.write(
                self.style.SUCCESS(
                    f'¡Éxito! Evento #{event.id} ({event.title}) configurado con {event.zones.count()} zonas '
                    f'({total_seats} asientos numerados + General sin numerar).'
                )
            )
