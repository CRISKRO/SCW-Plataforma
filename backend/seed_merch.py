import os
import django
from django.utils.text import slugify

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from merch.models import Category, Product

# Create categories
cat_ropa, _ = Category.objects.get_or_create(name='Ropa', defaults={'slug': slugify('Ropa')})
cat_mascaras, _ = Category.objects.get_or_create(name='Máscaras', defaults={'slug': slugify('Máscaras')})
cat_accesorios, _ = Category.objects.get_or_create(name='Accesorios', defaults={'slug': slugify('Accesorios')})

# Create products
products = [
  {"name": 'Playera Oficial "Sangre Negra"', "price": 450.00, "category": cat_ropa, "is_active": True},
  {"name": 'Máscara Pro "El Matador"', "price": 1200.00, "category": cat_mascaras, "is_active": True},
  {"name": 'Hoodie ARENA Invierno', "price": 850.00, "category": cat_ropa, "is_active": True},
  {"name": 'Gorra Clásica Logo', "price": 350.00, "category": cat_accesorios, "is_active": True},
]

for p in products:
    Product.objects.get_or_create(name=p["name"], defaults={"price": p["price"], "category": p["category"], "is_active": p["is_active"], "description": "Producto oficial de SCW Dojo."})

print("Productos semilla creados exitosamente.")
