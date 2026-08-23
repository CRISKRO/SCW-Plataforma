from django.contrib import admin
from .models import EventZone, Seat

class SeatInline(admin.TabularInline):
    model = Seat
    extra = 0
    readonly_fields = ('row_name', 'seat_number')

@admin.register(EventZone)
class EventZoneAdmin(admin.ModelAdmin):
    list_display = ('event', 'zone_type', 'price', 'price_abono', 'rows', 'seats_per_row')
    list_filter = ('event', 'zone_type')
    inlines = [SeatInline]

@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ('zone', 'row_name', 'seat_number', 'is_available')
    list_filter = ('is_available', 'zone__event')
    search_fields = ('row_name', 'seat_number')
