from django.db import models
from django.utils.translation import gettext_lazy as _


class Category(models.Model):
    name = models.CharField(_('nombre de la categoría'), max_length=100)
    slug = models.SlugField(unique=True)

    class Meta:
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE)
    name = models.CharField(_('nombre del producto'), max_length=200)
    description = models.TextField(_('descripción'), blank=True)
    price = models.DecimalField(_('precio (MXN)'), max_digits=8, decimal_places=2)
    stock = models.PositiveIntegerField(_('stock disponible'), default=0)
    sizes_available = models.CharField(_('tallas disponibles'), max_length=100, blank=True, help_text="Ej: S, M, L, XL")
    is_clothing = models.BooleanField(_('es ropa (stock por talla)'), default=False)
    stock_by_size = models.JSONField(_('stock detallado por talla'), default=dict, blank=True)
    image = models.ImageField(_('imagen del producto'), upload_to='products/', blank=True, null=True)
    is_active = models.BooleanField(_('activo en tienda'), default=True)
    free_shipping = models.BooleanField(_('envío gratis'), default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'

    def __str__(self):
        return self.name

    @property
    def image_url(self):
        """Compatibility: returns the URL of the image or empty string."""
        if self.image and hasattr(self.image, 'url'):
            return self.image.url
        return ''
