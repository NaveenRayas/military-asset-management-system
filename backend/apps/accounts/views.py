from rest_framework import status, viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from .models import User
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    LoginSerializer
)
from .permissions import IsAdmin
from apps.audit.utils import create_audit_log
from apps.audit.models import AuditLog

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = data['user']

        # Create login audit record
        create_audit_log(
            user=user,
            action=AuditLog.Action.LOGIN,
            entity_type='User',
            entity_id=user.id,
            description=f"User {user.email} logged in successfully.",
            metadata={'role': user.role, 'base': user.base.name if user.base else None},
            request=request
        )

        return Response({
            'user': UserSerializer(user).data,
            'access': data['access'],
            'refresh': data['refresh']
        }, status=status.HTTP_200_OK)

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass

        create_audit_log(
            user=request.user,
            action=AuditLog.Action.LOGOUT,
            entity_type='User',
            entity_id=request.user.id,
            description=f"User {request.user.email} logged out.",
            request=request
        )
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)

class UserViewSet(viewsets.ModelViewSet):
    """
    User Management: Admin only.
    Normal users / Base Commanders / Logistics Officers get HTTP 403.
    """
    queryset = User.objects.all().select_related('base')
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        create_audit_log(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            entity_type='User',
            entity_id=user.id,
            description=f"Created user {user.email} with role {user.role}.",
            metadata={'role': user.role, 'base_id': user.base_id},
            request=self.request
        )

    def perform_update(self, serializer):
        old_user = self.get_object()
        old_role = old_user.role
        user = serializer.save()

        # Check if role changed
        if old_role != user.role:
            create_audit_log(
                user=self.request.user,
                action=AuditLog.Action.USER_ROLE_CHANGE,
                entity_type='User',
                entity_id=user.id,
                description=f"Changed user {user.email} role from {old_role} to {user.role}.",
                metadata={'old_role': old_role, 'new_role': user.role},
                request=self.request
            )
        else:
            create_audit_log(
                user=self.request.user,
                action=AuditLog.Action.UPDATE,
                entity_type='User',
                entity_id=user.id,
                description=f"Updated user details for {user.email}.",
                request=self.request
            )

    def perform_destroy(self, instance):
        # Prevent self-deletion
        if instance.id == self.request.user.id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("You cannot delete your own account.")

        # Soft delete / deactivate
        instance.is_active = False
        instance.save()
        create_audit_log(
            user=self.request.user,
            action=AuditLog.Action.DELETE,
            entity_type='User',
            entity_id=instance.id,
            description=f"Deactivated user {instance.email}.",
            request=self.request
        )
