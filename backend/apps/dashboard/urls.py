from django.urls import path
from .views import DashboardSummaryView, NetMovementDetailView

urlpatterns = [
    path('summary/', DashboardSummaryView.as_view(), name='dashboard_summary'),
    path('net-movement/', NetMovementDetailView.as_view(), name='dashboard_net_movement'),
]
