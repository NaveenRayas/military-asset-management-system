"""
URL configuration for config project.
Military Asset Management System
"""

from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # OpenAPI Schema & Interactive Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Application API routes
    path('api/', include('apps.accounts.urls')),
    path('api/bases/', include('apps.bases.urls')),
    path('api/', include('apps.equipment.urls')),
    path('api/purchases/', include('apps.purchases.urls')),
    path('api/transfers/', include('apps.transfers.urls')),
    path('api/assignments/', include('apps.assignments.urls')),
    path('api/expenditures/', include('apps.expenditures.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/audit-logs/', include('apps.audit.urls')),
]
