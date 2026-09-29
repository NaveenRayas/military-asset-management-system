from rest_framework import serializers
from .models import EquipmentType, Inventory
from apps.bases.serializers import BaseSimpleSerializer

class EquipmentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipmentType
        fields = [
            'id',
            'name',
            'category',
            'unit',
            'description',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class InventorySerializer(serializers.ModelSerializer):
    base_details = BaseSimpleSerializer(source='base', read_only=True)
    equipment_type_details = EquipmentTypeSerializer(source='equipment_type', read_only=True)
    assigned_quantity = serializers.SerializerMethodField()
    available_quantity = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = [
            'id',
            'base',
            'base_details',
            'equipment_type',
            'equipment_type_details',
            'quantity',
            'assigned_quantity',
            'available_quantity',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assigned_quantity(self, obj):
        from apps.assignments.models import Assignment
        active_assignments = Assignment.objects.filter(
            base=obj.base,
            equipment_type=obj.equipment_type,
            status=Assignment.Status.ACTIVE
        )
        total = sum(a.quantity for a in active_assignments)
        return total

    def get_available_quantity(self, obj):
        assigned = self.get_assigned_quantity(obj)
        available = obj.quantity - assigned
        return max(0, available)
