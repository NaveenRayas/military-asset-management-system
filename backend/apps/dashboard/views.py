from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta

from apps.bases.models import Base
from apps.equipment.models import EquipmentType, Inventory
from apps.purchases.models import Purchase
from apps.transfers.models import Transfer
from apps.assignments.models import Assignment
from apps.expenditures.models import Expenditure

class DashboardSummaryView(APIView):
    """
    Computes dashboard KPI metrics and chart datasets based on filters:
    - date_from, date_to
    - base_id
    - equipment_type_id
    Role-based scoping enforced for Base Commander.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # 1. Resolve base filter
        base_id = None
        if user.role == 'BASE_COMMANDER':
            base_id = user.base_id
        else:
            param_base = request.query_params.get('base_id')
            if param_base and param_base != 'all':
                try:
                    base_id = int(param_base)
                except ValueError:
                    base_id = None

        # 2. Resolve equipment type filter
        equipment_type_id = None
        param_eq = request.query_params.get('equipment_type_id')
        if param_eq and param_eq != 'all':
            try:
                equipment_type_id = int(param_eq)
            except ValueError:
                equipment_type_id = None

        # 3. Resolve date range
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        # Helper query builders
        def apply_base_filter(qs, field_name='base_id'):
            if base_id:
                return qs.filter(**{field_name: base_id})
            return qs

        def apply_equipment_filter(qs):
            if equipment_type_id:
                return qs.filter(equipment_type_id=equipment_type_id)
            return qs

        # --- A. OPENING BALANCE (Prior to date_from) ---
        opening_balance = 0
        if date_from:
            prior_purchases_qs = apply_equipment_filter(apply_base_filter(Purchase.objects.filter(purchase_date__lt=date_from)))
            prior_purchases = prior_purchases_qs.aggregate(s=Sum('quantity'))['s'] or 0

            prior_exp_qs = apply_equipment_filter(apply_base_filter(Expenditure.objects.filter(expenditure_date__lt=date_from)))
            prior_exp = prior_exp_qs.aggregate(s=Sum('quantity'))['s'] or 0

            if base_id:
                prior_tin_qs = apply_equipment_filter(Transfer.objects.filter(to_base_id=base_id, status=Transfer.Status.COMPLETED, transfer_date__lt=date_from))
                prior_tin = prior_tin_qs.aggregate(s=Sum('quantity'))['s'] or 0

                prior_tout_qs = apply_equipment_filter(Transfer.objects.filter(from_base_id=base_id, status=Transfer.Status.COMPLETED, transfer_date__lt=date_from))
                prior_tout = prior_tout_qs.aggregate(s=Sum('quantity'))['s'] or 0
            else:
                prior_tin = 0
                prior_tout = 0

            opening_balance = prior_purchases + prior_tin - prior_tout - prior_exp

        # --- B. PERIOD METRICS ---
        p_qs = apply_equipment_filter(apply_base_filter(Purchase.objects.all()))
        if date_from:
            p_qs = p_qs.filter(purchase_date__gte=date_from)
        if date_to:
            p_qs = p_qs.filter(purchase_date__lte=date_to)
        purchases = p_qs.aggregate(s=Sum('quantity'))['s'] or 0

        # Transfers In
        if base_id:
            tin_qs = apply_equipment_filter(Transfer.objects.filter(to_base_id=base_id, status=Transfer.Status.COMPLETED))
        else:
            tin_qs = apply_equipment_filter(Transfer.objects.filter(status=Transfer.Status.COMPLETED))
        if date_from:
            tin_qs = tin_qs.filter(transfer_date__gte=date_from)
        if date_to:
            tin_qs = tin_qs.filter(transfer_date__lte=date_to)
        transfer_in = tin_qs.aggregate(s=Sum('quantity'))['s'] or 0

        # Transfers Out
        if base_id:
            tout_qs = apply_equipment_filter(Transfer.objects.filter(from_base_id=base_id, status=Transfer.Status.COMPLETED))
        else:
            tout_qs = apply_equipment_filter(Transfer.objects.filter(status=Transfer.Status.COMPLETED))
        if date_from:
            tout_qs = tout_qs.filter(transfer_date__gte=date_from)
        if date_to:
            tout_qs = tout_qs.filter(transfer_date__lte=date_to)
        transfer_out = tout_qs.aggregate(s=Sum('quantity'))['s'] or 0

        # If system-wide, internal transfers do not alter global inventory
        if not base_id:
            effective_transfer_in = 0
            effective_transfer_out = 0
            display_transfer_in = transfer_in
            display_transfer_out = transfer_out
        else:
            effective_transfer_in = transfer_in
            effective_transfer_out = transfer_out
            display_transfer_in = transfer_in
            display_transfer_out = transfer_out

        # Expenditures
        exp_qs = apply_equipment_filter(apply_base_filter(Expenditure.objects.all()))
        if date_from:
            exp_qs = exp_qs.filter(expenditure_date__gte=date_from)
        if date_to:
            exp_qs = exp_qs.filter(expenditure_date__lte=date_to)
        expenditures = exp_qs.aggregate(s=Sum('quantity'))['s'] or 0

        # Assigned
        assign_qs = apply_equipment_filter(apply_base_filter(Assignment.objects.filter(status=Assignment.Status.ACTIVE)))
        assigned = assign_qs.aggregate(s=Sum('quantity'))['s'] or 0

        # Calculations
        net_movement = purchases + effective_transfer_in - effective_transfer_out
        closing_balance = opening_balance + net_movement - expenditures

        # --- C. CHART DATASETS ---
        # 1. Inventory by Equipment Type
        inv_qs = apply_equipment_filter(apply_base_filter(Inventory.objects.all()))
        inventory_by_equipment = list(
            inv_qs.values('equipment_type__name', 'equipment_type__category')
            .annotate(total_quantity=Sum('quantity'))
            .filter(total_quantity__gt=0)
            .order_by('-total_quantity')[:10]
        )

        # 2. Base-wise inventory
        base_wise_inventory = []
        if user.role != 'BASE_COMMANDER' and not base_id:
            base_inv_qs = Inventory.objects.values('base__name', 'base__code').annotate(
                total_quantity=Sum('quantity')
            ).order_by('-total_quantity')
            base_wise_inventory = list(base_inv_qs)
        elif base_id:
            b_obj = Base.objects.filter(id=base_id).first()
            if b_obj:
                b_total = Inventory.objects.filter(base_id=base_id).aggregate(s=Sum('quantity'))['s'] or 0
                base_wise_inventory = [{'base__name': b_obj.name, 'base__code': b_obj.code, 'total_quantity': b_total}]

        # 3. Monthly / Timeline trends (last 6 months or in period)
        # Aggregate purchases, transfers, expenditures by date
        timeline_data = self._compute_timeline_trends(base_id, equipment_type_id, date_from, date_to)

        # 4. Category breakdown
        category_distribution = list(
            inv_qs.values('equipment_type__category')
            .annotate(total_quantity=Sum('quantity'))
            .order_by('-total_quantity')
        )

        return Response({
            'kpis': {
                'opening_balance': opening_balance,
                'purchases': purchases,
                'transfer_in': display_transfer_in,
                'transfer_out': display_transfer_out,
                'net_movement': net_movement,
                'closing_balance': closing_balance,
                'assigned': assigned,
                'expended': expenditures,
            },
            'charts': {
                'inventory_by_equipment': inventory_by_equipment,
                'base_wise_inventory': base_wise_inventory,
                'timeline': timeline_data,
                'category_distribution': category_distribution,
            },
            'filters_applied': {
                'base_id': base_id,
                'equipment_type_id': equipment_type_id,
                'date_from': date_from,
                'date_to': date_to,
            }
        }, status=status.HTTP_200_OK)

    def _compute_timeline_trends(self, base_id, equipment_type_id, date_from, date_to):
        """Generates timeline data series grouped by date for charts."""
        # Query purchases
        p_qs = Purchase.objects.all()
        if base_id:
            p_qs = p_qs.filter(base_id=base_id)
        if equipment_type_id:
            p_qs = p_qs.filter(equipment_type_id=equipment_type_id)
        if date_from:
            p_qs = p_qs.filter(purchase_date__gte=date_from)
        if date_to:
            p_qs = p_qs.filter(purchase_date__lte=date_to)
        
        p_by_date = dict(p_qs.values_list('purchase_date').annotate(s=Sum('quantity')))

        # Query expenditures
        e_qs = Expenditure.objects.all()
        if base_id:
            e_qs = e_qs.filter(base_id=base_id)
        if equipment_type_id:
            e_qs = e_qs.filter(equipment_type_id=equipment_type_id)
        if date_from:
            e_qs = e_qs.filter(expenditure_date__gte=date_from)
        if date_to:
            e_qs = e_qs.filter(expenditure_date__lte=date_to)

        e_by_date = dict(e_qs.values_list('expenditure_date').annotate(s=Sum('quantity')))

        # Query transfers
        t_qs = Transfer.objects.filter(status=Transfer.Status.COMPLETED)
        if base_id:
            t_in = dict(t_qs.filter(to_base_id=base_id).values_list('transfer_date').annotate(s=Sum('quantity')))
            t_out = dict(t_qs.filter(from_base_id=base_id).values_list('transfer_date').annotate(s=Sum('quantity')))
        else:
            t_in = dict(t_qs.values_list('transfer_date').annotate(s=Sum('quantity')))
            t_out = {}

        # Combine all unique dates and sort
        all_dates = sorted(set(list(p_by_date.keys()) + list(e_by_date.keys()) + list(t_in.keys()) + list(t_out.keys())))
        
        # Take most recent 15 dates
        all_dates = all_dates[-15:]

        timeline = []
        for d in all_dates:
            d_str = d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d)
            timeline.append({
                'date': d_str,
                'purchases': p_by_date.get(d, 0),
                'expenditures': e_by_date.get(d, 0),
                'transfer_in': t_in.get(d, 0),
                'transfer_out': t_out.get(d, 0),
            })

        return timeline

class NetMovementDetailView(APIView):
    """
    Detailed Net Movement modal popup data.
    Returns:
    - purchases total (+)
    - transfer in total (+)
    - transfer out total (-)
    - net movement total
    - granular transaction table (Date, Reference, Equipment Type, Quantity, Base, Transaction Type)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        base_id = None
        if user.role == 'BASE_COMMANDER':
            base_id = user.base_id
        else:
            param_base = request.query_params.get('base_id')
            if param_base and param_base != 'all':
                try:
                    base_id = int(param_base)
                except ValueError:
                    base_id = None

        equipment_type_id = None
        param_eq = request.query_params.get('equipment_type_id')
        if param_eq and param_eq != 'all':
            try:
                equipment_type_id = int(param_eq)
            except ValueError:
                equipment_type_id = None

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        transactions = []

        # 1. Purchases (+)
        p_qs = Purchase.objects.all().select_related('base', 'equipment_type')
        if base_id:
            p_qs = p_qs.filter(base_id=base_id)
        if equipment_type_id:
            p_qs = p_qs.filter(equipment_type_id=equipment_type_id)
        if date_from:
            p_qs = p_qs.filter(purchase_date__gte=date_from)
        if date_to:
            p_qs = p_qs.filter(purchase_date__lte=date_to)

        purchases_total = 0
        for p in p_qs:
            purchases_total += p.quantity
            transactions.append({
                'date': p.purchase_date.strftime('%Y-%m-%d'),
                'reference': p.reference_number,
                'equipment_type': p.equipment_type.name,
                'category': p.equipment_type.category,
                'quantity': p.quantity,
                'signed_quantity': f"+{p.quantity}",
                'raw_quantity': p.quantity,
                'base': p.base.name,
                'transaction_type': 'PURCHASE',
                'details': f"Supplier: {p.supplier}"
            })

        # 2. Transfer In (+)
        transfer_in_total = 0
        t_in_qs = Transfer.objects.filter(status=Transfer.Status.COMPLETED).select_related('to_base', 'from_base', 'equipment_type')
        if base_id:
            t_in_qs = t_in_qs.filter(to_base_id=base_id)
        if equipment_type_id:
            t_in_qs = t_in_qs.filter(equipment_type_id=equipment_type_id)
        if date_from:
            t_in_qs = t_in_qs.filter(transfer_date__gte=date_from)
        if date_to:
            t_in_qs = t_in_qs.filter(transfer_date__lte=date_to)

        for t in t_in_qs:
            transfer_in_total += t.quantity
            transactions.append({
                'date': t.transfer_date.strftime('%Y-%m-%d'),
                'reference': t.reference_number,
                'equipment_type': t.equipment_type.name,
                'category': t.equipment_type.category,
                'quantity': t.quantity,
                'signed_quantity': f"+{t.quantity}",
                'raw_quantity': t.quantity,
                'base': t.to_base.name,
                'transaction_type': 'TRANSFER_IN',
                'details': f"From: {t.from_base.name}"
            })

        # 3. Transfer Out (-)
        transfer_out_total = 0
        t_out_qs = Transfer.objects.filter(status=Transfer.Status.COMPLETED).select_related('from_base', 'to_base', 'equipment_type')
        if base_id:
            t_out_qs = t_out_qs.filter(from_base_id=base_id)
        if equipment_type_id:
            t_out_qs = t_out_qs.filter(equipment_type_id=equipment_type_id)
        if date_from:
            t_out_qs = t_out_qs.filter(transfer_date__gte=date_from)
        if date_to:
            t_out_qs = t_out_qs.filter(transfer_date__lte=date_to)

        for t in t_out_qs:
            transfer_out_total += t.quantity
            transactions.append({
                'date': t.transfer_date.strftime('%Y-%m-%d'),
                'reference': t.reference_number,
                'equipment_type': t.equipment_type.name,
                'category': t.equipment_type.category,
                'quantity': t.quantity,
                'signed_quantity': f"-{t.quantity}",
                'raw_quantity': -t.quantity,
                'base': t.from_base.name,
                'transaction_type': 'TRANSFER_OUT',
                'details': f"To: {t.to_base.name}"
            })

        # Calculate Net Movement
        if base_id:
            net_movement = purchases_total + transfer_in_total - transfer_out_total
        else:
            # System-wide: net movement is simply all purchases (since internal transfers net to 0)
            net_movement = purchases_total

        # Sort transactions by date descending
        transactions.sort(key=lambda x: x['date'], reverse=True)

        return Response({
            'summary': {
                'purchases_total': purchases_total,
                'transfer_in_total': transfer_in_total,
                'transfer_out_total': transfer_out_total,
                'net_movement': net_movement,
                'display_equation': f"+{purchases_total} (Purchases) + {transfer_in_total} (Transfer In) - {transfer_out_total} (Transfer Out) = {net_movement:+d}"
            },
            'transactions': transactions
        }, status=status.HTTP_200_OK)
