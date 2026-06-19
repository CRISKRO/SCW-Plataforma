from django.contrib import admin
from .models import Fighter, Event, Match, Chronicle

@admin.register(Fighter)
class FighterAdmin(admin.ModelAdmin):
    list_display = ('name', 'nickname', 'instagram', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'nickname')

class MatchInline(admin.TabularInline):
    model = Match
    extra = 1

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'date_time', 'location', 'status')
    list_filter = ('status', 'date_time')
    search_fields = ('title', 'location')
    inlines = [MatchInline]

@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ('event', 'match_type', 'order')
    list_filter = ('event',)

@admin.register(Chronicle)
class ChronicleAdmin(admin.ModelAdmin):
    list_display = ('title', 'writer', 'photographer', 'created_at')
    search_fields = ('title', 'writer', 'photographer')
