from django.contrib import admin
from .models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product_name', 'price')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'contact_email', 'total_amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('contact_email', 'mp_payment_id')
    inlines = [OrderItemInline]
    readonly_fields = ('mp_preference_id', 'mp_payment_id')

    def save_model(self, request, obj, form, change):
        if change:
            old_obj = Order.objects.get(pk=obj.pk)
            if old_obj.status != obj.status and obj.status in ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']:
                try:
                    from .email_orders import send_status_update_email
                    send_status_update_email(obj)
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error enviando correo de actualizacion de orden: {str(e)}")
        super().save_model(request, obj, form, change)
