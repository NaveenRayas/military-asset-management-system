from rest_framework import serializers
from .models import Assignment
from apps.bases.serializers import BaseSimpleSerializer
from apps.equipment.serializers import EquipmentTypeSerializer
from apps.equipment.models import Inventory

class AssignmentSerializer(serializers.ModelSerializer):
    base_details = BaseSimpleSerializer(source='base', read_only=True)
    equipment_type_details = EquipmentTypeSerializer(source='equipment_type', read_only=True)
    assigned_by_email = serializers.ReadOnlyField(source='assigned_by.email')

    class Meta:
        model = Assignment
        fields = [
            'id',
            'base',
            'base_details',
            'equipment_type',
            'equipment_type_details',
            'quantity',
            'personnel_name',
            'personnel_identifier',
            'assignment_date',
            'status',
            'notes',
            'assigned_by',
            'assigned_by_email',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'assigned_by', 'created_at', 'updated_at']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Assigned quantity must be greater than zero.")
        return value

    def validate(self, attrs):
        base = attrs.get('base', self.instance.base if self.instance else None)
        equipment_type = attrs.get('equipment_type', self.instance.equipment_type if self.instance else None)
        quantity = attrs.get('quantity', self.instance.quantity if self.instance else 0)
        status = attrs.get('status', self.instance.status if self.instance else Assignment.Status.ACTIVE)

        request = self.context.get('request')
        if request and request.user and request.user.role == 'BASE_COMMANDER':
            if base and base.id != request.user.base_id:
                raise serializers.ValidationError({
                    "base": "Base Commanders can only manage assignments for their assigned base."
                })

        # When creating a new active assignment or activating an assignment:
        # Check that unassigned inventory is sufficient
        if status == Assignment.Status.ACTIVE and base and equipment_type:
            inv = Inventory.objects.filter(base=base, equipment_type=equipment_type).first()
            total_qty = inv.quantity if inv else 0

            active_qs = Assignment.objects.filter(
                base=base,
                equipment_type=equipment_type,
                status=Assignment.Status.ACTIVE
            )
            if self.instance:
                active_qs = active_qs.exclude(id=self.instance.id)

            already_assigned = sum(a.quantity for a in active_qs)
            available_to_assign = max(0, total_qty - already_assigned)

            if quantity > available_to_assign:
                raise serializers.ValidationError({
                    "quantity": f"Insufficient unassigned inventory. Available: {available_to_assign}, Requested: {quantity} (Total inventory: {total_qty}, Currently assigned: {already_assigned})."
                })

        return attrs
