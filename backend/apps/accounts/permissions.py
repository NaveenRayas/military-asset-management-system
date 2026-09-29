from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """Allows access only to Admin users or superusers."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'ADMIN' or request.user.is_superuser)
        )

class IsBaseCommander(permissions.BasePermission):
    """Allows access only to Base Commander users."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'BASE_COMMANDER'
        )

class IsLogisticsOfficer(permissions.BasePermission):
    """Allows access only to Logistics Officer users."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'LOGISTICS_OFFICER'
        )

class IsAdminOrBaseCommander(permissions.BasePermission):
    """Allows access to Admin and Base Commander users."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role in ['ADMIN', 'BASE_COMMANDER'] or request.user.is_superuser)
        )

class IsAdminOrReadOnly(permissions.BasePermission):
    """Allows full access to Admin; read-only access to authenticated users."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user.role == 'ADMIN' or request.user.is_superuser)

class CanAccessBase(permissions.BasePermission):
    """
    Object-level and view-level permission to ensure:
    - Admin can access any base
    - Base Commander can ONLY access their assigned base
    - Logistics Officer has access for logistics operations
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'ADMIN' or request.user.is_superuser:
            return True

        # If checking a Base object directly
        from apps.bases.models import Base
        if isinstance(obj, Base):
            return request.user.base_id == obj.id

        # If checking an object with a base foreign key
        if hasattr(obj, 'base_id'):
            return request.user.base_id == obj.base_id
        
        # If checking a Transfer object with from_base or to_base
        if hasattr(obj, 'from_base_id') and hasattr(obj, 'to_base_id'):
            return request.user.base_id in [obj.from_base_id, obj.to_base_id]

        return False
