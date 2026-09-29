from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from .models import Expenditure
from .serializers import ExpenditureSerializer
from apps.equipment.models import Inventory
from apps.audit.utils import create_audit_log
from apps.audit.models import AuditLog

class ExpenditureViewSet(viewsets.ModelViewSet):
    """
    Expenditure Management.
    - Admin: view all, record expenditures
    - Base Commander: view expenditures for their base, record expenditures for their base
    - Logistics Officer: view expenditures
    """
    queryset = Expenditure.objects.all().select_related('base', 'equipment_type', 'recorded_by')
    serializer_class = ExpenditureSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Expenditure.objects.all().select_related('base', 'equipment_type', 'recorded_by')

        if user.role == 'BASE_COMMANDER':
            if not user.base_id:
                return Expenditure.objects.none()
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
            qs = qs.filter(expenditure_date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(expenditure_date__lte=date_to)

        reason = self.request.query_params.get('reason')
        if reason:
            qs = qs.filter(reason__icontains=reason)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(reference_number__icontains=search) |
                Q(reason__icontains=search) |
                Q(equipment_type__name__icontains=search) |
                Q(notes__icontains=search)
            )

        return qs.order_by('-expenditure_date', '-created_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            expenditure = serializer.save(recorded_by=request.user)

            # Reduce inventory with row locking
            inv = Inventory.objects.select_for_update().filter(
                base=expenditure.base,
                equipment_type=expenditure.equipment_type
            ).first()

            if not inv or inv.quantity < expenditure.quantity:
                raise ValidationError(
                    f"Insufficient inventory at {expenditure.base.name} for {expenditure.equipment_type.name}."
                )

            inv.quantity -= expenditure.quantity
            inv.save()

            # Record audit log
            create_audit_log(
                user=request.user,
                action=AuditLog.Action.EXPEND,
                entity_type='Expenditure',
                entity_id=expenditure.id,
                description=f"Recorded expenditure {expenditure.reference_number}: -{expenditure.quantity} {expenditure.equipment_type.name} at {expenditure.base.name} ({expenditure.reason}).",
                metadata={
                    'reference_number': expenditure.reference_number,
                    'base_id': expenditure.base_id,
                    'equipment_type_id': expenditure.equipment_type_id,
                    'quantity': expenditure.quantity,
                    'reason': expenditure.reason
                },
                request=request
            )

        headers = self.get_success_headers(serializer.data)
        return Response(ExpenditureSerializer(expenditure).data, status=status.HTTP_201_CREATED, headers=headers)
