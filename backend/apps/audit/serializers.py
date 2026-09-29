from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.ReadOnlyField(source='user.email')
    user_role = serializers.ReadOnlyField(source='user.role')
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user',
            'user_email',
            'user_name',
            'user_role',
            'action',
            'entity_type',
            'entity_id',
            'description',
            'metadata',
            'ip_address',
            'timestamp'
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        if not obj.user:
            return 'System'
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.email
