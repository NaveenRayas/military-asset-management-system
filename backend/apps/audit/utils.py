from .models import AuditLog

def get_client_ip(request):
    """Safely extracts client IP address from request."""
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def create_audit_log(user=None, action=AuditLog.Action.CREATE, entity_type='', entity_id='', description='', metadata=None, request=None):
    """
    Creates an immutable audit log entry.
    """
    if metadata is None:
        metadata = {}

    # Extract user from request if user not explicitly passed
    if user is None and request and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user

    ip_address = get_client_ip(request)

    return AuditLog.objects.create(
        user=user if (user and user.is_authenticated) else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else '',
        description=description,
        metadata=metadata,
        ip_address=ip_address
    )
