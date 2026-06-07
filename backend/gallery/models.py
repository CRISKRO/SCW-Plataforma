from django.db import models

class GalleryImage(models.Model):
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True, null=True)
    image = models.ImageField(upload_to='gallery/')
    col_span = models.CharField(max_length=50, default='md:col-span-1', help_text="Tailwind class for grid column span (e.g. md:col-span-2)")
    row_span = models.CharField(max_length=50, default='md:row-span-1', help_text="Tailwind class for grid row span (e.g. md:row-span-2)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
