from django.contrib import admin
from .models import Raffle, RaffleTicket

class RaffleTicketInline(admin.TabularInline):
    model = RaffleTicket
    extra = 0
    readonly_fields = ('number', 'status', 'buyer_name', 'order_item')
    can_delete = False

@admin.register(Raffle)
class RaffleAdmin(admin.ModelAdmin):
    list_display = ('title', 'price', 'total_tickets', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('title', 'description')
    inlines = [RaffleTicketInline]

@admin.register(RaffleTicket)
class RaffleTicketAdmin(admin.ModelAdmin):
    list_display = ('raffle', 'number', 'status', 'buyer_name', 'order_item')
    list_filter = ('status', 'raffle')
    search_fields = ('buyer_name', 'raffle__title', 'number')
    readonly_fields = ('raffle', 'number')
