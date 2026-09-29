from django.db import models

class Base(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    location = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bases'
        ordering = ['name']
        verbose_name = 'Military Base'
        verbose_name_plural = 'Military Bases'

    def __str__(self):
        return f"{self.name} ({self.code})"
