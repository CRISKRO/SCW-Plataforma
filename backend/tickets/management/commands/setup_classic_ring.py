"""
Alias para el comando setup_wrestling_factory.
Permite ejecutar indistintamente:
    python manage.py setup_classic_ring
o
    python manage.py setup_wrestling_factory
"""
from tickets.management.commands.setup_wrestling_factory import Command

__all__ = ['Command']
