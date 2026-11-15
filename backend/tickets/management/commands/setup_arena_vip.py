from django.core.management.base import BaseCommand
from django.db import transaction
from events.models import Event
from tickets.models import EventZone, Seat

class Command(BaseCommand):
    help = 'Aplica la plantilla interactiva Arena VIP (idéntica a la imagen) a uno o todos los eventos'

    def add_arguments(self, parser):
        parser.add_argument('event_id', nargs='?', type=int, default=None, help='ID del evento al que aplicar la plantilla')
        parser.add_argument('--all', action='store_true', help='Aplicar a todos los eventos')
        parser.add_argument('--mesas-ringside', type=str, default='1500.00', help='Precio Mesas Ringside')
        parser.add_argument('--mesas-vip', type=str, default='1000.00', help='Precio Mesas VIP')
        parser.add_argument('--primera-fila', type=str, default='500.00', help='Precio Primera Fila')
        parser.add_argument('--segunda-fila', type=str, default='400.00', help='Precio Segunda Fila')
        parser.add_argument('--general', type=str, default='250.00', help='Precio General')

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
            # Si no especifica, buscar evento 7 o el último creado
            ev = Event.objects.filter(id=7).first() or Event.objects.order_by('-id').first()
            if not ev:
                self.stderr.write(self.style.ERROR('No hay eventos registrados en la base de datos.'))
                return
            events = [ev]

        prices = {
            'MESAS_VIP_RINGSIDE': options.get('mesas_ringside', '1500.00'),
            'MESAS_VIP': options.get('mesas_vip', '1000.00'),
            'PRIMERA_FILA': options.get('primera_fila', '500.00'),
            'SEGUNDA_FILA': options.get('segunda_fila', '400.00'),
            'GENERAL': options.get('general', '250.00'),
        }

        for event in events:
            self.stdout.write(f'Configurando plantilla Arena VIP para el Evento #{event.id}: {event.title}...')
            with transaction.atomic():
                # Limpiar zonas actuales
                EventZone.objects.filter(event=event).delete()

                # Asignar configuración de mapa
                event.map_type = 'ARENA_VIP'
                event.location = 'Labrú'
                event.map_config = {
                    "width": 1200,
                    "height": 980,
                    "ring": { "x": 340, "y": 300, "width": 360, "height": 360, "title": "RING SCW" },
                    "general_areas": [
                        { "id": "gen_top", "title": "GENERAL", "x": 270, "y": 40, "width": 300, "height": 140 },
                        { "id": "gen_right", "title": "GENERAL", "x": 840, "y": 190, "width": 330, "height": 600 },
                        { "id": "gen_bottom", "title": "GENERAL", "x": 270, "y": 790, "width": 570, "height": 90 }
                    ],
                    "aisles": [
                        { "id": "pasillo_top", "title": "PASILLO", "x": 490, "y": 200, "width": 60, "height": 90 }
                    ],
                    "entrance": { "x": 185, "y": 780, "title": "ENTRADA" }
                }
                event.save(update_fields=['map_type', 'map_config', 'location'])

                # 1. Mesas VIP Ringside (8 Mesas con entrada)
                z_ringside = EventZone.objects.create(
                    event=event,
                    zone_type=EventZone.ZoneType.MESAS_VIP_RINGSIDE,
                    name='Mesas VIP Ringside',
                    color='#d946ef',
                    price=prices.get('MESAS_VIP_RINGSIDE', '1500.00'),
                    rows=8,
                    seats_per_row=1
                )
                for t in range(1, 9):
                    Seat.objects.create(
                        zone=z_ringside,
                        row_name='RINGSIDE',
                        seat_number=t,
                        table_number=t,
                        custom_label=str(t),
                        x=185.0,
                        y=210.0 + (t * 62.0),
                        is_available=True
                    )

                # 2. Mesas VIP (12 Mesas en 2 filas de 6)
                z_vip = EventZone.objects.create(
                    event=event,
                    zone_type=EventZone.ZoneType.MESAS_VIP,
                    name='Mesas VIP',
                    color='#eab308',
                    price=prices.get('MESAS_VIP', '1000.00'),
                    rows=2,
                    seats_per_row=6
                )
                xs_vip = [635.0, 705.0, 775.0, 845.0, 915.0, 985.0]
                for idx, x_pos in enumerate(xs_vip):
                    t = idx + 1
                    Seat.objects.create(
                        zone=z_vip,
                        row_name='VIP 1',
                        seat_number=t,
                        table_number=t,
                        custom_label=str(t),
                        x=x_pos,
                        y=70.0,
                        is_available=True
                    )
                for idx, x_pos in enumerate(xs_vip):
                    t = idx + 7
                    Seat.objects.create(
                        zone=z_vip,
                        row_name='VIP 2',
                        seat_number=t,
                        table_number=t,
                        custom_label=str(t),
                        x=x_pos,
                        y=138.0,
                        is_available=True
                    )

                # 3. Primera Fila (44 Asientos Rojos)
                z_f1 = EventZone.objects.create(
                    event=event,
                    zone_type=EventZone.ZoneType.PRIMERA_FILA,
                    name='Primera Fila',
                    color='#ef4444',
                    price=prices.get('PRIMERA_FILA', '500.00'),
                    rows=1,
                    seats_per_row=44
                )

                # 4. Segunda Fila (44 Asientos Azules)
                z_f2 = EventZone.objects.create(
                    event=event,
                    zone_type=EventZone.ZoneType.SEGUNDA_FILA,
                    name='Segunda Fila',
                    color='#2563eb',
                    price=prices.get('SEGUNDA_FILA', '400.00'),
                    rows=1,
                    seats_per_row=44
                )

                # Top - Izquierda de Pasillo: 1 a 6
                top_left_xs = [335.0, 360.0, 385.0, 410.0, 435.0, 460.0]
                for i, x_pos in enumerate(top_left_xs):
                    s_num = i + 1
                    Seat.objects.create(zone=z_f1, row_name='NORTE', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=242.0)
                    Seat.objects.create(zone=z_f2, row_name='NORTE', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=205.0)

                # Top - Derecha de Pasillo: 7 a 12
                top_right_xs = [580.0, 605.0, 630.0, 655.0, 680.0, 705.0]
                for i, x_pos in enumerate(top_right_xs):
                    s_num = i + 7
                    Seat.objects.create(zone=z_f1, row_name='NORTE', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=242.0)
                    Seat.objects.create(zone=z_f2, row_name='NORTE', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=205.0)

                # Derecha: 13 a 28 (vertical)
                for i in range(16):
                    s_num = 13 + i
                    y_pos = 260.0 + (i * 29.0)
                    Seat.objects.create(zone=z_f1, row_name='ESTE', seat_number=s_num, custom_label=str(s_num), x=748.0, y=y_pos)
                    Seat.objects.create(zone=z_f2, row_name='ESTE', seat_number=s_num, custom_label=str(s_num), x=785.0, y=y_pos)

                # Abajo: 44 a 29 (de izquierda a derecha: 44, 43, 42 ... 29)
                for i in range(16):
                    s_num = 44 - i
                    x_pos = 320.0 + (i * 27.5)
                    Seat.objects.create(zone=z_f1, row_name='SUR', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=715.0)
                    Seat.objects.create(zone=z_f2, row_name='SUR', seat_number=s_num, custom_label=str(s_num), x=x_pos, y=752.0)

                # 5. Zona General (Sin numeración)
                EventZone.objects.create(
                    event=event,
                    zone_type=EventZone.ZoneType.GENERAL,
                    name='General',
                    color='#064e3b',
                    price=prices.get('GENERAL', '250.00'),
                    rows=0,
                    seats_per_row=0
                )

            total_seats = sum(z.seats.count() for z in event.zones.all())
            self.stdout.write(self.style.SUCCESS(
                f'¡Éxito! Evento #{event.id} configurado con 5 zonas ({total_seats} asientos numerados + General sin numerar).'
            ))
