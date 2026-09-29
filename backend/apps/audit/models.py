from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    class Action(models.TextChoices):
        LOGIN = 'LOGIN', 'Login'
        LOGOUT = 'LOGOUT', 'Logout'
        CREATE = 'CREATE', 'Create'
        UPDATE = 'UPDATE', 'Update'
        DELETE = 'DELETE', 'Delete'
        PURCHASE = 'PURCHASE', 'Purchase'
        TRANSFER = 'TRANSFER', 'Transfer'
        ASSIGN = 'ASSIGN', 'Assign'
        EXPEND = 'EXPEND', 'Expend'
        USER_ROLE_CHANGE = 'USER_ROLE_CHANGE', 'User Role Change'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=50, choices=Action.choices)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.CharField(max_length=50, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        user_display = self.user.email if self.user else 'System'
        return f"[{self.timestamp:%Y-%m-%d %H:%M:%S}] {self.action} by {user_display}: {self.description[:40]}"
