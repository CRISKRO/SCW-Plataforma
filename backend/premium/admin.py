from django.contrib import admin
from .models import SubscriptionPlan, UserSubscription, PremiumVideo

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'duration_days', 'is_active')

@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active', 'plan')
    search_fields = ('user__email',)

@admin.register(PremiumVideo)
class PremiumVideoAdmin(admin.ModelAdmin):
    list_display = ('title', 'release_date', 'is_published')
    list_filter = ('is_published',)
    search_fields = ('title',)
