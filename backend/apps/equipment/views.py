from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, F
from .models import EquipmentType, Inventory
from .serializers import EquipmentTypeSerializer, InventorySerializer
from apps.accounts.permissions import IsAdminOrReadOnly
from apps.audit.utils import create_audit_log
from apps.audit.models import AuditLog

class EquipmentTypeViewSet(viewsets.ModelViewSet):
    """
    CRUD for Equipment Types.
    Admin can create, update, delete.
    Other roles have read-only access.
    """
    queryset = EquipmentType.objects.all()
    serializer_class = EquipmentTypeSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        qs = EquipmentType.objects.all()
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs.order_by('name')

    def perform_create(self, serializer):
        equip = serializer.save()
        create_audit_log(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            entity_type='EquipmentType',
            entity_id=equip.id,
            description=f"Created equipment type '{equip.name}' under category '{equip.category}'.",
            metadata={'name': equip.name, 'category': equip.category, 'unit': equip.unit},
            request=self.request
        )

    def perform_update(self, serializer):
        equip = serializer.save()
        create_audit_log(
            user=self.request.user,
            action=AuditLog.Action.UPDATE,
            entity_type='EquipmentType',
            entity_id=equip.id,
            description=f"Updated equipment type '{equip.name}'.",
            request=self.request
        )

    def destroy(self, request, *args, **kwargs):
        equip = self.get_object()
        
        # Check if any inventory or transactions exist
        has_inventory = equip.inventories.filter(quantity__gt=0).exists()
        has_purchases = equip.purchases.exists()
        has_transfers = equip.transfers.exists()
        has_assignments = equip.assignments.exists()
        has_expenditures = equip.expenditures.exists()

        if has_inventory or has_purchases or has_transfers or has_assignments or has_expenditures:
            equip.is_active = False
            equip.save()
            create_audit_log(
                user=request.user,
                action=AuditLog.Action.DELETE,
                entity_type='EquipmentType',
                entity_id=equip.id,
                description=f"Deactivated equipment type '{equip.name}' due to transaction history.",
                request=request
            )
            return Response(
                {"detail": f"Equipment type '{equip.name}' has transaction records and was deactivated instead."},
                status=status.HTTP_200_OK
            )

        name = equip.name
        equip_id = equip.id
        equip.delete()
        create_audit_log(
            user=request.user,
            action=AuditLog.Action.DELETE,
            entity_type='EquipmentType',
            entity_id=equip_id,
            description=f"Deleted equipment type '{name}'.",
            request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

class InventoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Inventory read-only ViewSet.
    Inventories are updated automatically through Purchases, Transfers, and Expenditures.
    Base Commander only sees their base's inventory.
    """
    queryset = Inventory.objects.all().select_related('base', 'equipment_type')
    serializer_class = InventorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Inventory.objects.all().select_related('base', 'equipment_type')

        if user.role == 'BASE_COMMANDER':
            if not user.base_id:
                return Inventory.objects.none()
            qs = qs.filter(base_id=user.base_id)
        else:
            base_id = self.request.query_params.get('base_id')
            if base_id:
                qs = qs.filter(base_id=base_id)

        equipment_type_id = self.request.query_params.get('equipment_type_id')
        if equipment_type_id:
            qs = qs.filter(equipment_type_id=equipment_type_id)

        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(equipment_type__category=category)

        return qs.order_by('base__name', 'equipment_type__name')

class InventorySummaryView(APIView):
    """
    Returns high-level inventory statistics.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = Inventory.objects.all()

        if user.role == 'BASE_COMMANDER':
            if not user.base_id:
                return Response({'total_items': 0, 'total_quantity': 0, 'by_category': []})
            qs = qs.filter(base_id=user.base_id)
        else:
            base_id = request.query_params.get('base_id')
            if base_id:
                qs = qs.filter(base_id=base_id)

        total_quantity = qs.aggregate(total=Sum('quantity'))['total'] or 0
        total_items = qs.filter(quantity__gt=0).count()

        # Group by category
        by_category = qs.values('equipment_type__category').annotate(
            total_qty=Sum('quantity'),
            items_count=Count('id')
        ).order_by('-total_qty')

        return Response({
            'total_quantity': total_quantity,
            'total_items': total_items,
            'by_category': list(by_category)
        })
