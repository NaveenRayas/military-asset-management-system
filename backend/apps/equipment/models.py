from django.db import models

class EquipmentType(models.Model):
    class Category(models.TextChoices):
        VEHICLE = 'Vehicle', 'Vehicle'
        WEAPON = 'Weapon', 'Weapon'
        AMMUNITION = 'Ammunition', 'Ammunition'
        COMMUNICATION = 'Communication', 'Communication'
        PROTECTIVE = 'Protective Equipment', 'Protective Equipment'
        OTHER = 'Other', 'Other'

    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, choices=Category.choices, default=Category.OTHER)
    unit = models.CharField(max_length=30, default='units')
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'equipment_types'
        ordering = ['name']
        verbose_name = 'Equipment Type'
        verbose_name_plural = 'Equipment Types'

    def __str__(self):
        return f"{self.name} ({self.category})"

class Inventory(models.Model):
    base = models.ForeignKey(
        'bases.Base',
        on_delete=models.CASCADE,
        related_name='inventories'
    )
    equipment_type = models.ForeignKey(
        EquipmentType,
        on_delete=models.CASCADE,
        related_name='inventories'
    )
    quantity = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventories'
        ordering = ['base__name', 'equipment_type__name']
        verbose_name = 'Inventory Record'
        verbose_name_plural = 'Inventory Records'
        constraints = [
            models.UniqueConstraint(
                fields=['base', 'equipment_type'],
                name='unique_base_equipment_inventory'
            ),
            models.CheckConstraint(
                check=models.Q(quantity__gte=0),
                name='inventory_quantity_non_negative'
            )
        ]

    def __str__(self):
        return f"{self.base.name} - {self.equipment_type.name}: {self.quantity} {self.equipment_type.unit}"
