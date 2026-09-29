from django.db import models
from django.conf import settings

class Transfer(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    from_base = models.ForeignKey(
        'bases.Base',
        on_delete=models.PROTECT,
        related_name='outgoing_transfers'
    )
    to_base = models.ForeignKey(
        'bases.Base',
        on_delete=models.PROTECT,
        related_name='incoming_transfers'
    )
    equipment_type = models.ForeignKey(
        'equipment.EquipmentType',
        on_delete=models.PROTECT,
        related_name='transfers'
    )
    quantity = models.PositiveIntegerField()
    transfer_date = models.DateField()
    reference_number = models.CharField(max_length=100, unique=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED
    )
    notes = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_transfers'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'transfers'
        ordering = ['-transfer_date', '-created_at']
        verbose_name = 'Transfer'
        verbose_name_plural = 'Transfers'
        constraints = [
            models.CheckConstraint(
                check=~models.Q(from_base=models.F('to_base')),
                name='different_source_destination_bases'
            ),
            models.CheckConstraint(
                check=models.Q(quantity__gt=0),
                name='transfer_positive_quantity'
            )
        ]

    def __str__(self):
        return f"{self.reference_number}: {self.quantity} x {self.equipment_type.name} ({self.from_base.name} -> {self.to_base.name}) [{self.status}]"
