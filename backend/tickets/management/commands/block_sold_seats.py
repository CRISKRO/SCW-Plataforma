"""
Alias para el comando restore_sold_seats.
Permite ejecutar indistintamente:
    python manage.py block_sold_seats
o
    python manage.py restore_sold_seats
"""
from tickets.management.commands.restore_sold_seats import Command

__all__ = ['Command']
