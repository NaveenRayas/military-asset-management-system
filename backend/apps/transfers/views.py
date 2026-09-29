from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from .models import Transfer
from .serializers import TransferSerializer
from apps.equipment.models import Inventory
from apps.audit.utils import create_audit_log
from apps.audit.models import AuditLog

class TransferViewSet(viewsets.ModelViewSet):
    """
    Transfer Management.
    - Admin: view all, create, update
    - Base Commander: view transfers involving their base, create transfers for their base
    - Logistics Officer: view all, create transfers
    """
    queryset = Transfer.objects.all().select_related('from_base', 'to_base', 'equipment_type', 'created_by')
    serializer_class = TransferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Transfer.objects.all().select_related('from_base', 'to_base', 'equipment_type', 'created_by')

        if user.role == 'BASE_COMMANDER':
            if not user.base_id:
                return Transfer.objects.none()
            qs = qs.filter(Q(from_base_id=user.base_id) | Q(to_base_id=user.base_id))
        else:
            from_base_id = self.request.query_params.get('from_base_id')
            if from_base_id:
                qs = qs.filter(from_base_id=from_base_id)
            to_base_id = self.request.query_params.get('to_base_id')
            if to_base_id:
                qs = qs.filter(to_base_id=to_base_id)

        equipment_type_id = self.request.query_params.get('equipment_type_id')
        if equipment_type_id:
            qs = qs.filter(equipment_type_id=equipment_type_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(transfer_date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(transfer_date__lte=date_to)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(reference_number__icontains=search) |
                Q(equipment_type__name__icontains=search) |
                Q(from_base__name__icontains=search) |
                Q(to_base__name__icontains=search) |
                Q(notes__icontains=search)
            )

        return qs.order_by('-transfer_date', '-created_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        transfer_status = serializer.validated_data.get('status', Transfer.Status.COMPLETED)

        with transaction.atomic():
            transfer = serializer.save(created_by=request.user)

            if transfer_status == Transfer.Status.COMPLETED:
                # Deduct from source base
                source_inv = Inventory.objects.select_for_update().filter(
                    base=transfer.from_base,
                    equipment_type=transfer.equipment_type
                ).first()

                if not source_inv or source_inv.quantity < transfer.quantity:
                    raise ValidationError(
                        f"Source base '{transfer.from_base.name}' has insufficient inventory for {transfer.equipment_type.name}."
                    )

                source_inv.quantity -= transfer.quantity
                source_inv.save()

                # Add to destination base
                dest_inv, _ = Inventory.objects.select_for_update().get_or_create(
                    base=transfer.to_base,
                    equipment_type=transfer.equipment_type,
                    defaults={'quantity': 0}
                )
                dest_inv.quantity += transfer.quantity
                dest_inv.save()

            # Record audit log
            create_audit_log(
                user=request.user,
                action=AuditLog.Action.TRANSFER,
                entity_type='Transfer',
                entity_id=transfer.id,
                description=f"Recorded transfer {transfer.reference_number}: {transfer.quantity} {transfer.equipment_type.name} from {transfer.from_base.name} to {transfer.to_base.name} [{transfer.status}].",
                metadata={
                    'reference_number': transfer.reference_number,
                    'from_base_id': transfer.from_base_id,
                    'to_base_id': transfer.to_base_id,
                    'equipment_type_id': transfer.equipment_type_id,
                    'quantity': transfer.quantity,
                    'status': transfer.status,
                },
                request=request
            )

        headers = self.get_success_headers(serializer.data)
        return Response(TransferSerializer(transfer).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_status = instance.status

        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status', old_status)

        with transaction.atomic():
            # If changing from PENDING to COMPLETED: execute movement
            if old_status == Transfer.Status.PENDING and new_status == Transfer.Status.COMPLETED:
                source_inv = Inventory.objects.select_for_update().filter(
                    base=instance.from_base,
                    equipment_type=instance.equipment_type
                ).first()

                if not source_inv or source_inv.quantity < instance.quantity:
                    raise ValidationError(
                        f"Source base '{instance.from_base.name}' has insufficient inventory to complete this transfer."
                    )

                source_inv.quantity -= instance.quantity
                source_inv.save()

                dest_inv, _ = Inventory.objects.select_for_update().get_or_create(
                    base=instance.to_base,
                    equipment_type=instance.equipment_type,
                    defaults={'quantity': 0}
                )
                dest_inv.quantity += instance.quantity
                dest_inv.save()

            transfer = serializer.save()

            create_audit_log(
                user=request.user,
                action=AuditLog.Action.TRANSFER,
                entity_type='Transfer',
                entity_id=transfer.id,
                description=f"Updated transfer {transfer.reference_number} status to {transfer.status}.",
                metadata={'status': transfer.status},
                request=request
            )

        return Response(TransferSerializer(transfer).data)
