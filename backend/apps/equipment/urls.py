from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EquipmentTypeViewSet, InventoryViewSet, InventorySummaryView

router = DefaultRouter()
router.register(r'equipment', EquipmentTypeViewSet, basename='equipment')
router.register(r'inventory', InventoryViewSet, basename='inventory')

urlpatterns = [
    path('inventory/summary/', InventorySummaryView.as_view(), name='inventory_summary'),
    path('', include(router.urls)),
]
