from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.db.models import Q
from .models import Assignment
from .serializers import AssignmentSerializer
from apps.audit.utils import create_audit_log
from apps.audit.models import AuditLog

class AssignmentViewSet(viewsets.ModelViewSet):
    """
    Assignment Management.
    - Admin: view all, create, update
    - Base Commander: view assignments for their base, create assignments
    - Logistics Officer: view assignments
    """
    queryset = Assignment.objects.all().select_related('base', 'equipment_type', 'assigned_by')
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Assignment.objects.all().select_related('base', 'equipment_type', 'assigned_by')

        if user.role == 'BASE_COMMANDER':
            if not user.base_id:
                return Assignment.objects.none()
            qs = qs.filter(base_id=user.base_id)
        else:
            base_id = self.request.query_params.get('base_id')
            if base_id:
                qs = qs.filter(base_id=base_id)

        equipment_type_id = self.request.query_params.get('equipment_type_id')
        if equipment_type_id:
            qs = qs.filter(equipment_type_id=equipment_type_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(personnel_name__icontains=search) |
                Q(personnel_identifier__icontains=search) |
                Q(equipment_type__name__icontains=search) |
                Q(notes__icontains=search)
            )

        return qs.order_by('-assignment_date', '-created_at')

    def perform_create(self, serializer):
        assignment = serializer.save(assigned_by=self.request.user)
        create_audit_log(
            user=self.request.user,
            action=AuditLog.Action.ASSIGN,
            entity_type='Assignment',
            entity_id=assignment.id,
            description=f"Assigned {assignment.quantity} {assignment.equipment_type.name} to {assignment.personnel_name} ({assignment.personnel_identifier}) at {assignment.base.name}.",
            metadata={
                'personnel_name': assignment.personnel_name,
                'personnel_identifier': assignment.personnel_identifier,
                'base_id': assignment.base_id,
                'equipment_type_id': assignment.equipment_type_id,
                'quantity': assignment.quantity,
                'status': assignment.status
            },
            request=self.request
        )

    def perform_update(self, serializer):
        old_assignment = self.get_object()
        old_status = old_assignment.status
        assignment = serializer.save()

        create_audit_log(
            user=self.request.user,
            action=AuditLog.Action.UPDATE,
            entity_type='Assignment',
            entity_id=assignment.id,
            description=f"Updated assignment {assignment.id} for {assignment.personnel_name} (Status: {old_status} -> {assignment.status}).",
            metadata={'old_status': old_status, 'new_status': assignment.status},
            request=self.request
        )
