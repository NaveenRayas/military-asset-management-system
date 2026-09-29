from rest_framework import serializers
from .models import Base

class BaseSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Base
        fields = ['id', 'name', 'code', 'location']

class BaseSerializer(serializers.ModelSerializer):
    personnel_count = serializers.SerializerMethodField()
    inventory_items_count = serializers.SerializerMethodField()

    class Meta:
        model = Base
        fields = [
            'id',
            'name',
            'code',
            'location',
            'description',
            'is_active',
            'personnel_count',
            'inventory_items_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_personnel_count(self, obj):
        return obj.assigned_users.filter(is_active=True).count()

    def get_inventory_items_count(self, obj):
        return obj.inventories.filter(quantity__gt=0).count()
