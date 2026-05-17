from django.contrib import admin
from .models import Enrollment

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'age', 'experience', 'is_contacted', 'created_at')
    list_filter = ('is_contacted', 'experience', 'created_at')
    search_fields = ('name', 'email', 'phone')
