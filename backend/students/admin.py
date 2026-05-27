from django.contrib import admin
from .models import Enrollment

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'age', 'experience', 'status', 'payment_status', 'last_payment_date', 'payment_due_date', 'is_contacted', 'created_at')
    list_filter = ('status', 'payment_status', 'is_contacted', 'experience', 'created_at')
    search_fields = ('name', 'email', 'phone')
