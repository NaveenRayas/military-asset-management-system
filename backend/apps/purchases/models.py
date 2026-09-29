from django.db import models
from django.conf import settings
from decimal import Decimal

class Purchase(models.Model):
    base = models.ForeignKey(
        'bases.Base',
        on_delete=models.PROTECT,
        related_name='purchases'
    )
    equipment_type = models.ForeignKey(
        'equipment.EquipmentType',
        on_delete=models.PROTECT,
        related_name='purchases'
    )
    quantity = models.PositiveIntegerField()
    purchase_date = models.DateField()
    reference_number = models.CharField(max_length=100, unique=True)
    supplier = models.CharField(max_length=255)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, blank=True)
    notes = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_purchases'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchases'
        ordering = ['-purchase_date', '-created_at']
        verbose_name = 'Purchase'
        verbose_name_plural = 'Purchases'

    def save(self, *args, **kwargs):
        if self.quantity is not None and self.unit_cost is not None:
            self.total_cost = Decimal(self.quantity) * Decimal(self.unit_cost)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference_number}: {self.quantity} x {self.equipment_type.name} to {self.base.name}"
