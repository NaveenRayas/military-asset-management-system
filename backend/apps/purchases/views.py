from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from .models import Purchase
from .serializers import PurchaseSerializer
from apps.equipment.models import Inventory
from apps.audit.utils import create_audit_log
from apps.audit.models import AuditLog

class PurchaseViewSet(viewsets.ModelViewSet):
    """
    Purchase Management.
    - Admin: full access
    - Base Commander: purchases for their assigned base only
    - Logistics Officer: full view and creation access
    """
    queryset = Purchase.objects.all().select_related('base', 'equipment_type', 'created_by')
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Purchase.objects.all().select_related('base', 'equipment_type', 'created_by')

        if user.role == 'BASE_COMMANDER':
            if not user.base_id:
                return Purchase.objects.none()
            qs = qs.filter(base_id=user.base_id)
        else:
            base_id = self.request.query_params.get('base_id')
            if base_id:
                qs = qs.filter(base_id=base_id)

        equipment_type_id = self.request.query_params.get('equipment_type_id')
        if equipment_type_id:
            qs = qs.filter(equipment_type_id=equipment_type_id)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(purchase_date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(purchase_date__lte=date_to)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(reference_number__icontains=search) |
                Q(supplier__icontains=search) |
                Q(equipment_type__name__icontains=search) |
                Q(notes__icontains=search)
            )

        return qs.order_by('-purchase_date', '-created_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            purchase = serializer.save(created_by=request.user)

            # Update inventory with row locking
            inventory, created = Inventory.objects.select_for_update().get_or_create(
                base=purchase.base,
                equipment_type=purchase.equipment_type,
                defaults={'quantity': 0}
            )
            inventory.quantity += purchase.quantity
            inventory.save()

            # Record audit log
            create_audit_log(
                user=request.user,
                action=AuditLog.Action.PURCHASE,
                entity_type='Purchase',
                entity_id=purchase.id,
                description=f"Recorded purchase {purchase.reference_number}: +{purchase.quantity} {purchase.equipment_type.name} to {purchase.base.name}.",
                metadata={
                    'reference_number': purchase.reference_number,
                    'base_id': purchase.base_id,
                    'equipment_type_id': purchase.equipment_type_id,
                    'quantity': purchase.quantity,
                    'total_cost': str(purchase.total_cost),
                    'supplier': purchase.supplier,
                },
                request=request
            )

        headers = self.get_success_headers(serializer.data)
        return Response(PurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED, headers=headers)
