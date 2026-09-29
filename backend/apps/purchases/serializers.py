from rest_framework import serializers
from decimal import Decimal
from .models import Purchase
from apps.bases.serializers import BaseSimpleSerializer
from apps.equipment.serializers import EquipmentTypeSerializer

class PurchaseSerializer(serializers.ModelSerializer):
    base_details = BaseSimpleSerializer(source='base', read_only=True)
    equipment_type_details = EquipmentTypeSerializer(source='equipment_type', read_only=True)
    created_by_email = serializers.ReadOnlyField(source='created_by.email')
    total_cost = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id',
            'base',
            'base_details',
            'equipment_type',
            'equipment_type_details',
            'quantity',
            'purchase_date',
            'reference_number',
            'supplier',
            'unit_cost',
            'total_cost',
            'notes',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'total_cost', 'created_by', 'created_at', 'updated_at']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_unit_cost(self, value):
        if value < 0:
            raise serializers.ValidationError("Unit cost cannot be negative.")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            if user.role == 'BASE_COMMANDER':
                base = attrs.get('base')
                if base and base.id != user.base_id:
                    raise serializers.ValidationError({
                        "base": "Base Commanders can only record purchases for their assigned base."
                    })
        return attrs
