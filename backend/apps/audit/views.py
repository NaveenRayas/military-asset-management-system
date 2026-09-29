from rest_framework import viewsets, permissions
from django.db.models import Q
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Append-only Audit Log ViewSet.
    Normal users / officers cannot edit or delete audit logs.
    Admin can view all audit logs.
    Base Commander can view audit logs related to their base.
    """
    queryset = AuditLog.objects.all().select_related('user')
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = AuditLog.objects.all().select_related('user')

        if user.role == 'BASE_COMMANDER':
            if not user.base_id:
                return AuditLog.objects.none()
            base_id = user.base_id
            # Filter logs where user was from that base OR metadata targets that base
            qs = qs.filter(
                Q(user__base_id=base_id) |
                Q(metadata__base_id=base_id) |
                Q(metadata__from_base_id=base_id) |
                Q(metadata__to_base_id=base_id)
            )

        # Query filters
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        entity_type = self.request.query_params.get('entity_type')
        if entity_type:
            qs = qs.filter(entity_type=entity_type)

        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(timestamp__date__lte=date_to)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(description__icontains=search) |
                Q(entity_id__icontains=search) |
                Q(user__email__icontains=search)
            )

        return qs.order_by('-timestamp')
