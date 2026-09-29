from django.db import models
from django.conf import settings

class Expenditure(models.Model):
    base = models.ForeignKey(
        'bases.Base',
        on_delete=models.PROTECT,
        related_name='expenditures'
    )
    equipment_type = models.ForeignKey(
        'equipment.EquipmentType',
        on_delete=models.PROTECT,
        related_name='expenditures'
    )
    quantity = models.PositiveIntegerField()
    expenditure_date = models.DateField()
    reason = models.CharField(max_length=255)
    reference_number = models.CharField(max_length=100, unique=True)
    notes = models.TextField(blank=True, default='')
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_expenditures'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expenditures'
        ordering = ['-expenditure_date', '-created_at']
        verbose_name = 'Expenditure'
        verbose_name_plural = 'Expenditures'
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantity__gt=0),
                name='expenditure_positive_quantity'
            )
        ]

    def __str__(self):
        return f"{self.reference_number}: {self.quantity} x {self.equipment_type.name} at {self.base.name} ({self.reason})"
