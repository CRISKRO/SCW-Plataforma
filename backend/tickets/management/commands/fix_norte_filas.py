"""
Corrige las filas invertidas en la sección NORTE del mapa Labrú (ARENA_VIP).

Problema: en NORTE los asientos pegados al ring quedaron en la zona
"Segunda Fila" y los de atrás en "Primera Fila".

Qué hace:
  - Intercambia SOLO la zona (nombre/color) de los asientos de la fila NORTE.
  - NO borra ni crea asientos, NO mueve posiciones, NO toca órdenes ni estados.
    Cada asiento conserva su ID, así que los boletos vendidos siguen ligados
    al mismo lugar físico y siguen bloqueados.
  - Actualiza el texto guardado en los boletos ya vendidos de esos asientos
    ("Segunda Fila" <-> "Primera Fila") para que coincida con el mapa.

Uso:
    python manage.py fix_norte_filas --event 16            # solo muestra (no cambia nada)
    python manage.py fix_norte_filas --event 16 --apply    # aplica
"""
import json
import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from events.models import Event
from payments.models import OrderItem
from tickets.models import EventZone, Seat

ROW = 'NORTE'
TMP_ROW = 'NORTE__TMP'
SWAPS = [
    ('Primera Fila', 'Segunda Fila'),
    ('PRIMERA_FILA', 'SEGUNDA_FILA'),
    ('Primera fila', 'Segunda fila'),
]


def swap_text(text):
    if not text:
        return text
    for a, b in SWAPS:
        text = text.replace(a, '\x00').replace(b, a).replace('\x00', b)
    return text


class Command(BaseCommand):
    help = 'Intercambia Primera/Segunda Fila en la sección NORTE sin afectar boletos vendidos.'

    def add_arguments(self, parser):
        parser.add_argument('--event', type=int, required=True, help='ID del evento')
        parser.add_argument('--apply', action='store_true', help='Aplica los cambios (sin esto solo muestra)')

    def handle(self, *args, **opts):
        try:
            event = Event.objects.get(id=opts['event'])
        except Event.DoesNotExist:
            raise CommandError('Evento no encontrado')

        try:
            z1 = EventZone.objects.get(event=event, zone_type='PRIMERA_FILA')
            z2 = EventZone.objects.get(event=event, zone_type='SEGUNDA_FILA')
        except EventZone.DoesNotExist:
            raise CommandError('El evento no tiene zonas PRIMERA_FILA y SEGUNDA_FILA')

        with transaction.atomic():
            seats = list(
                Seat.objects.select_for_update()
                .filter(zone__in=[z1, z2], row_name=ROW)
                .order_by('seat_number', 'zone_id')
            )
            s1 = [s for s in seats if s.zone_id == z1.id]
            s2 = [s for s in seats if s.zone_id == z2.id]

            if not s1 or len(s1) != len(s2):
                raise CommandError(f'Conteo inesperado en NORTE: primera={len(s1)} segunda={len(s2)}. No se cambia nada.')
            if any(s.y is None for s in seats):
                raise CommandError('Hay asientos sin coordenadas. No se cambia nada.')
            if sorted(s.seat_number for s in s1) != sorted(s.seat_number for s in s2):
                raise CommandError('Los números de asiento no coinciden entre ambas filas. No se cambia nada.')

            # En NORTE el ring queda abajo: la fila con mayor "y" es la pegada al ring.
            avg1 = sum(s.y for s in s1) / len(s1)
            avg2 = sum(s.y for s in s2) / len(s2)
            if avg1 > avg2:
                self.stdout.write(self.style.SUCCESS(
                    'NORTE ya está correcto (Primera Fila es la pegada al ring). No hay nada que hacer.'))
                return

            items = list(
                OrderItem.objects.select_for_update()
                .filter(seat__in=seats)
                .select_related('order', 'seat')
            )

            self.stdout.write(f'Evento: {event.title} (id {event.id})')
            self.stdout.write(f'Asientos NORTE a re-etiquetar: {len(seats)} ({len(s1)} por fila)')
            self.stdout.write(f'Boletos ligados a esos asientos (cualquier estado): {len(items)}')
            for it in items:
                self.stdout.write(
                    f'  Orden #{it.order_id} [{it.order.status}] asiento_id={it.seat_id}\n'
                    f'      antes:   {it.product_name}\n'
                    f'      después: {swap_text(it.product_name)}'
                )

            if not opts['apply']:
                self.stdout.write(self.style.WARNING(
                    '\nMODO PRUEBA: no se cambió nada. Agrega --apply para aplicar.'))
                return

            # Respaldo antes de tocar nada
            backup = {
                'event': event.id,
                'date': timezone.now().isoformat(),
                'seats': [{'id': s.id, 'zone_id': s.zone_id, 'row_name': s.row_name,
                           'seat_number': s.seat_number, 'x': s.x, 'y': s.y,
                           'is_available': s.is_available} for s in seats],
                'items': [{'id': it.id, 'order_id': it.order_id, 'seat_id': it.seat_id,
                           'product_name': it.product_name, 'size': it.size} for it in items],
            }
            fname = os.path.abspath(
                f'backup_fix_norte_event{event.id}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.json')
            with open(fname, 'w', encoding='utf-8') as fh:
                json.dump(backup, fh, ensure_ascii=False, indent=2)

            sold_before = {s.id: s.is_available for s in seats}
            items_before = {it.id: it.seat_id for it in items}

            # Paso 1: cambiar de zona usando una fila temporal (evita choque de unicidad)
            Seat.objects.filter(id__in=[s.id for s in s1]).update(zone=z2, row_name=TMP_ROW)
            Seat.objects.filter(id__in=[s.id for s in s2]).update(zone=z1, row_name=TMP_ROW)
            # Paso 2: regresar el nombre de fila
            Seat.objects.filter(id__in=[s.id for s in seats]).update(row_name=ROW)

            # Paso 3: actualizar el texto de los boletos ya emitidos
            for it in items:
                new_name = swap_text(it.product_name)
                if new_name != it.product_name:
                    OrderItem.objects.filter(id=it.id).update(product_name=new_name)

            # Verificación: nada se liberó ni se desligó
            after = {s.id: s.is_available for s in Seat.objects.filter(id__in=sold_before)}
            if after != sold_before:
                raise CommandError('La disponibilidad cambió inesperadamente. Se revierte todo.')
            after_items = dict(OrderItem.objects.filter(id__in=items_before).values_list('id', 'seat_id'))
            if after_items != items_before:
                raise CommandError('Algún boleto perdió su asiento. Se revierte todo.')

        self.stdout.write(self.style.SUCCESS(
            f'\nListo. {len(seats)} asientos re-etiquetados, {len(items)} boletos actualizados.\n'
            f'Respaldo: {fname}'))
