from rest_framework import serializers
from .models import Expenditure
from apps.bases.serializers import BaseSimpleSerializer
from apps.equipment.serializers import EquipmentTypeSerializer
from apps.equipment.models import Inventory
from apps.assignments.models import Assignment

class ExpenditureSerializer(serializers.ModelSerializer):
    base_details = BaseSimpleSerializer(source='base', read_only=True)
    equipment_type_details = EquipmentTypeSerializer(source='equipment_type', read_only=True)
    recorded_by_email = serializers.ReadOnlyField(source='recorded_by.email')

    class Meta:
        model = Expenditure
        fields = [
            'id',
            'base',
            'base_details',
            'equipment_type',
            'equipment_type_details',
            'quantity',
            'expenditure_date',
            'reason',
            'reference_number',
            'notes',
            'recorded_by',
            'recorded_by_email',
            'created_at'
        ]
        read_only_fields = ['id', 'recorded_by', 'created_at']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Expenditure quantity must be greater than zero.")
        return value

    def validate(self, attrs):
        base = attrs.get('base')
        equipment_type = attrs.get('equipment_type')
        quantity = attrs.get('quantity')

        request = self.context.get('request')
        if request and request.user and request.user.role == 'BASE_COMMANDER':
            if base and base.id != request.user.base_id:
                raise serializers.ValidationError({
                    "base": "Base Commanders can only record expenditures for their assigned base."
                })

        if base and equipment_type and quantity:
            inv = Inventory.objects.filter(base=base, equipment_type=equipment_type).first()
            current_qty = inv.quantity if inv else 0

            # Check unassigned available quantity
            active_assigned = Assignment.objects.filter(
                base=base,
                equipment_type=equipment_type,
                status=Assignment.Status.ACTIVE
            )
            assigned_qty = sum(a.quantity for a in active_assigned)
            available_qty = max(0, current_qty - assigned_qty)

            if quantity > available_qty:
                raise serializers.ValidationError({
                    "quantity": f"Insufficient available inventory for expenditure. Available: {available_qty}, Requested: {quantity} (Total inventory: {current_qty}, Assigned to personnel: {assigned_qty})."
                })

        return attrs
