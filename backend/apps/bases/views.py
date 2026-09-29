from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Base
from .serializers import BaseSerializer
from apps.accounts.permissions import IsAdminOrReadOnly
from apps.audit.utils import create_audit_log
from apps.audit.models import AuditLog

class BaseViewSet(viewsets.ModelViewSet):
    """
    CRUD for Bases.
    Admin: Full CRUD.
    Base Commander: Only can view their own assigned base.
    Logistics Officer: Read-only access to all bases for logistics planning.
    """
    queryset = Base.objects.all()
    serializer_class = BaseSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Base.objects.none()

        if user.role == 'ADMIN' or user.is_superuser:
            return Base.objects.all().order_by('name')

        if user.role == 'BASE_COMMANDER':
            if not user.base_id:
                return Base.objects.none()
            return Base.objects.filter(id=user.base_id)

        # Logistics Officer has read access to all active bases
        return Base.objects.filter(is_active=True).order_by('name')

    def perform_create(self, serializer):
        base = serializer.save()
        create_audit_log(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            entity_type='Base',
            entity_id=base.id,
            description=f"Created base {base.name} ({base.code}).",
            metadata={'name': base.name, 'code': base.code, 'location': base.location},
            request=self.request
        )

    def perform_update(self, serializer):
        base = serializer.save()
        create_audit_log(
            user=self.request.user,
            action=AuditLog.Action.UPDATE,
            entity_type='Base',
            entity_id=base.id,
            description=f"Updated base details for {base.name}.",
            request=self.request
        )

    def destroy(self, request, *args, **kwargs):
        base = self.get_object()
        
        # Check if base has active inventory or transactions
        has_inventory = base.inventories.filter(quantity__gt=0).exists()
        has_purchases = base.purchases.exists()
        has_transfers = base.outgoing_transfers.exists() or base.incoming_transfers.exists()
        has_assignments = base.assignments.exists()

        if has_inventory or has_purchases or has_transfers or has_assignments:
            # Safe deactivation instead of hard delete
            base.is_active = False
            base.save()
            create_audit_log(
                user=request.user,
                action=AuditLog.Action.DELETE,
                entity_type='Base',
                entity_id=base.id,
                description=f"Deactivated base {base.name} due to existing transaction history.",
                request=request
            )
            return Response(
                {"detail": f"Base '{base.name}' has transaction records and was deactivated instead of deleted."},
                status=status.HTTP_200_OK
            )

        base_name = base.name
        base_id = base.id
        base.delete()
        create_audit_log(
            user=request.user,
            action=AuditLog.Action.DELETE,
            entity_type='Base',
            entity_id=base_id,
            description=f"Deleted base {base_name}.",
            request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
