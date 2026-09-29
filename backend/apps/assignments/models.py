from django.db import models
from django.conf import settings

class Assignment(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        RETURNED = 'RETURNED', 'Returned'
        CANCELLED = 'CANCELLED', 'Cancelled'

    base = models.ForeignKey(
        'bases.Base',
        on_delete=models.PROTECT,
        related_name='assignments'
    )
    equipment_type = models.ForeignKey(
        'equipment.EquipmentType',
        on_delete=models.PROTECT,
        related_name='assignments'
    )
    quantity = models.PositiveIntegerField()
    personnel_name = models.CharField(max_length=150)
    personnel_identifier = models.CharField(max_length=100)
    assignment_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )
    notes = models.TextField(blank=True, default='')
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_assignments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assignments'
        ordering = ['-assignment_date', '-created_at']
        verbose_name = 'Assignment'
        verbose_name_plural = 'Assignments'
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantity__gt=0),
                name='assignment_positive_quantity'
            )
        ]

    def __str__(self):
        return f"{self.personnel_name} ({self.personnel_identifier}) - {self.quantity} x {self.equipment_type.name} [{self.status}]"
