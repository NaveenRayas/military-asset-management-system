from rest_framework import serializers
from .models import Transfer
from apps.bases.serializers import BaseSimpleSerializer
from apps.equipment.serializers import EquipmentTypeSerializer
from apps.equipment.models import Inventory
from apps.assignments.models import Assignment

class TransferSerializer(serializers.ModelSerializer):
    from_base_details = BaseSimpleSerializer(source='from_base', read_only=True)
    to_base_details = BaseSimpleSerializer(source='to_base', read_only=True)
    equipment_type_details = EquipmentTypeSerializer(source='equipment_type', read_only=True)
    created_by_email = serializers.ReadOnlyField(source='created_by.email')

    class Meta:
        model = Transfer
        fields = [
            'id',
            'from_base',
            'from_base_details',
            'to_base',
            'to_base_details',
            'equipment_type',
            'equipment_type_details',
            'quantity',
            'transfer_date',
            'reference_number',
            'status',
            'notes',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Transfer quantity must be greater than zero.")
        return value

    def validate(self, attrs):
        from_base = attrs.get('from_base')
        to_base = attrs.get('to_base')
        quantity = attrs.get('quantity')
        equipment_type = attrs.get('equipment_type')

        if from_base and to_base and from_base == to_base:
            raise serializers.ValidationError({
                "to_base": "Source and destination base cannot be the same."
            })

        # Role restriction for Base Commander
        request = self.context.get('request')
        if request and request.user and request.user.role == 'BASE_COMMANDER':
            user_base_id = request.user.base_id
            if from_base.id != user_base_id and to_base.id != user_base_id:
                raise serializers.ValidationError({
                    "non_field_errors": "Base Commanders can only manage transfers involving their assigned base."
                })

        # Check inventory sufficiency on create or completion
        status = attrs.get('status', Transfer.Status.COMPLETED)
        if status == Transfer.Status.COMPLETED and from_base and equipment_type and quantity:
            inv = Inventory.objects.filter(base=from_base, equipment_type=equipment_type).first()
            current_qty = inv.quantity if inv else 0
            
            # Active assignments should not be transferred
            active_assigned = Assignment.objects.filter(
                base=from_base,
                equipment_type=equipment_type,
                status=Assignment.Status.ACTIVE
            )
            assigned_qty = sum(a.quantity for a in active_assigned)
            available_qty = max(0, current_qty - assigned_qty)

            if quantity > available_qty:
                raise serializers.ValidationError({
                    "quantity": f"Insufficient available inventory at {from_base.name}. Required: {quantity}, Available: {available_qty} (Total: {current_qty}, Assigned: {assigned_qty})."
                })

        return attrs
