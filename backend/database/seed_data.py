"""
Database Seed Script for Military Asset Management System.
Seeds:
- 3 Bases: Alpha Base, Bravo Base, Charlie Base
- 7 Equipment Types across categories
- 3 Core Demo Users:
    - admin@example.com / Admin@12345 (Admin)
    - commander@example.com / Commander@12345 (Base Commander - Alpha Base)
    - logistics@example.com / Logistics@12345 (Logistics Officer)
- Initial inventory, purchases, transfers, assignments, expenditures, and audit logs.
"""

import os
import sys
from decimal import Decimal
from datetime import date, timedelta

# Setup django environment if executed directly
if __name__ == '__main__':
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.append(backend_dir)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    import django
    django.setup()

from django.db import transaction
from apps.accounts.models import User
from apps.bases.models import Base
from apps.equipment.models import EquipmentType, Inventory
from apps.purchases.models import Purchase
from apps.transfers.models import Transfer
from apps.assignments.models import Assignment
from apps.expenditures.models import Expenditure
from apps.audit.models import AuditLog

def seed():
    print("Beginning database seed...")

    with transaction.atomic():
        # 1. Bases
        bases_data = [
            {
                'name': 'Alpha Base',
                'code': 'BASE-ALPHA',
                'location': 'Sector 4, Northern Frontier',
                'description': 'Primary command and logistics hub for Northern Operations.'
            },
            {
                'name': 'Bravo Base',
                'code': 'BASE-BRAVO',
                'location': 'Sector 9, Eastern Desert Ridge',
                'description': 'Advanced armored reconnaissance and tactical response post.'
            },
            {
                'name': 'Charlie Base',
                'code': 'BASE-CHARLIE',
                'location': 'Sector 12, Coastal Highland',
                'description': 'Maritime defense, coastal surveillance and communications outpost.'
            }
        ]

        bases = {}
        for b_data in bases_data:
            base, created = Base.objects.get_or_create(
                code=b_data['code'],
                defaults=b_data
            )
            bases[base.name] = base
            print(f"Base '{base.name}' ({base.code}) {'created' if created else 'found'}.")

        # 2. Equipment Types
        equipment_data = [
            {
                'name': 'Armored Combat Vehicle M1',
                'category': EquipmentType.Category.VEHICLE,
                'unit': 'vehicles',
                'description': 'Tracked heavy infantry fighting vehicle with 30mm auto-cannon.'
            },
            {
                'name': 'Tactical Utility Vehicle 4x4',
                'category': EquipmentType.Category.VEHICLE,
                'unit': 'vehicles',
                'description': 'All-terrain multi-role light transport and patrol vehicle.'
            },
            {
                'name': 'Service Assault Rifle 5.56mm',
                'category': EquipmentType.Category.WEAPON,
                'unit': 'rifles',
                'description': 'Standard issue select-fire infantry service rifle.'
            },
            {
                'name': 'Heavy Machine Gun .50 Cal',
                'category': EquipmentType.Category.WEAPON,
                'unit': 'guns',
                'description': 'Belt-fed air-cooled heavy suppressive weapon.'
            },
            {
                'name': '5.56mm NATO Ammunition Crate (1000 rounds)',
                'category': EquipmentType.Category.AMMUNITION,
                'unit': 'crates',
                'description': 'High-velocity ball standard infantry ammunition.'
            },
            {
                'name': 'Tactical VHF/UHF Field Radio',
                'category': EquipmentType.Category.COMMUNICATION,
                'unit': 'units',
                'description': 'Frequency-hopping encrypted secure field communication transceiver.'
            },
            {
                'name': 'Advanced Combat Ballistic Helmet',
                'category': EquipmentType.Category.PROTECTIVE,
                'unit': 'helmets',
                'description': 'Level IIIA Kevlar composite protective helmet with NVG mount.'
            },
        ]

        equipments = {}
        for eq_data in equipment_data:
            eq, created = EquipmentType.objects.get_or_create(
                name=eq_data['name'],
                defaults=eq_data
            )
            equipments[eq.name] = eq
            print(f"Equipment '{eq.name}' {'created' if created else 'found'}.")

        # 3. Demo Users
        # ADMIN
        admin_user, created = User.objects.get_or_create(
            email='admin@example.com',
            defaults={
                'username': 'admin',
                'first_name': 'Chief Admin',
                'last_name': 'Commander',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin_user.set_password('Admin@12345')
        admin_user.role = User.Role.ADMIN
        admin_user.save()
        print(f"Admin user admin@example.com configured.")

        # BASE COMMANDER (Alpha Base)
        commander_user, created = User.objects.get_or_create(
            email='commander@example.com',
            defaults={
                'username': 'commander',
                'first_name': 'Col. Marcus',
                'last_name': 'Vance',
                'role': User.Role.BASE_COMMANDER,
                'base': bases['Alpha Base'],
            }
        )
        commander_user.set_password('Commander@12345')
        commander_user.role = User.Role.BASE_COMMANDER
        commander_user.base = bases['Alpha Base']
        commander_user.save()
        print(f"Base Commander commander@example.com assigned to Alpha Base.")

        # LOGISTICS OFFICER
        logistics_user, created = User.objects.get_or_create(
            email='logistics@example.com',
            defaults={
                'username': 'logistics',
                'first_name': 'Major Sarah',
                'last_name': 'Jenkins',
                'role': User.Role.LOGISTICS_OFFICER,
                'base': bases['Alpha Base'],
            }
        )
        logistics_user.set_password('Logistics@12345')
        logistics_user.role = User.Role.LOGISTICS_OFFICER
        logistics_user.save()
        print(f"Logistics Officer logistics@example.com configured.")

        # 4. Purchases (increases inventory & records audit)
        today = date.today()
        purchases_seed = [
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['Service Assault Rifle 5.56mm'],
                'quantity': 150,
                'purchase_date': today - timedelta(days=25),
                'reference_number': 'PUR-2026-001',
                'supplier': 'National Defense Arsenal Corp',
                'unit_cost': Decimal('850.00'),
                'notes': 'Quarterly standard armament requisition.'
            },
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['5.56mm NATO Ammunition Crate (1000 rounds)'],
                'quantity': 200,
                'purchase_date': today - timedelta(days=22),
                'reference_number': 'PUR-2026-002',
                'supplier': 'Precision Munitions Ltd',
                'unit_cost': Decimal('420.00'),
                'notes': 'Live-fire exercise inventory stock.'
            },
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['Tactical Utility Vehicle 4x4'],
                'quantity': 12,
                'purchase_date': today - timedelta(days=20),
                'reference_number': 'PUR-2026-003',
                'supplier': 'Armored Mobility Dynamics',
                'unit_cost': Decimal('65000.00'),
                'notes': 'Fleet enhancement for perimeter reconnaissance.'
            },
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['Armored Combat Vehicle M1'],
                'quantity': 6,
                'purchase_date': today - timedelta(days=18),
                'reference_number': 'PUR-2026-004',
                'supplier': 'Apex Defense Systems',
                'unit_cost': Decimal('1450000.00'),
                'notes': 'Heavy assault armor replenishment.'
            },
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['Tactical VHF/UHF Field Radio'],
                'quantity': 45,
                'purchase_date': today - timedelta(days=16),
                'reference_number': 'PUR-2026-005',
                'supplier': 'SecureComm Tactical Networks',
                'unit_cost': Decimal('3200.00'),
                'notes': 'Encrypted squad transceiver kits.'
            },
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['Advanced Combat Ballistic Helmet'],
                'quantity': 180,
                'purchase_date': today - timedelta(days=15),
                'reference_number': 'PUR-2026-006',
                'supplier': 'Titan Protective Armor Solutions',
                'unit_cost': Decimal('340.00'),
                'notes': 'Personnel protective gear standard supply.'
            },
            {
                'base': bases['Bravo Base'],
                'equipment_type': equipments['Service Assault Rifle 5.56mm'],
                'quantity': 100,
                'purchase_date': today - timedelta(days=14),
                'reference_number': 'PUR-2026-007',
                'supplier': 'National Defense Arsenal Corp',
                'unit_cost': Decimal('850.00'),
                'notes': 'Bravo base frontline deployment supply.'
            },
            {
                'base': bases['Bravo Base'],
                'equipment_type': equipments['Heavy Machine Gun .50 Cal'],
                'quantity': 15,
                'purchase_date': today - timedelta(days=12),
                'reference_number': 'PUR-2026-008',
                'supplier': 'Apex Defense Systems',
                'unit_cost': Decimal('14200.00'),
                'notes': 'Defensive perimeter emplacements.'
            },
            {
                'base': bases['Charlie Base'],
                'equipment_type': equipments['Tactical VHF/UHF Field Radio'],
                'quantity': 30,
                'purchase_date': today - timedelta(days=10),
                'reference_number': 'PUR-2026-009',
                'supplier': 'SecureComm Tactical Networks',
                'unit_cost': Decimal('3200.00'),
                'notes': 'Maritime outpost communications.'
            },
            {
                'base': bases['Charlie Base'],
                'equipment_type': equipments['Advanced Combat Ballistic Helmet'],
                'quantity': 75,
                'purchase_date': today - timedelta(days=8),
                'reference_number': 'PUR-2026-010',
                'supplier': 'Titan Protective Armor Solutions',
                'unit_cost': Decimal('340.00'),
                'notes': 'Coastal guard protective helmets.'
            },
        ]

        for p_data in purchases_seed:
            purchase, created = Purchase.objects.get_or_create(
                reference_number=p_data['reference_number'],
                defaults={**p_data, 'created_by': admin_user}
            )
            if created:
                inv, _ = Inventory.objects.get_or_create(
                    base=purchase.base,
                    equipment_type=purchase.equipment_type,
                    defaults={'quantity': 0}
                )
                inv.quantity += purchase.quantity
                inv.save()

                AuditLog.objects.create(
                    user=admin_user,
                    action=AuditLog.Action.PURCHASE,
                    entity_type='Purchase',
                    entity_id=str(purchase.id),
                    description=f"Initial seed purchase {purchase.reference_number}: +{purchase.quantity} {purchase.equipment_type.name} to {purchase.base.name}.",
                    metadata={'reference_number': purchase.reference_number, 'quantity': purchase.quantity},
                    ip_address='127.0.0.1'
                )

        print(f"Purchases seeded and initial inventory established.")

        # 5. Transfers (completed and pending)
        transfers_seed = [
            {
                'from_base': bases['Alpha Base'],
                'to_base': bases['Bravo Base'],
                'equipment_type': equipments['Service Assault Rifle 5.56mm'],
                'quantity': 30,
                'transfer_date': today - timedelta(days=7),
                'reference_number': 'TRF-2026-001',
                'status': Transfer.Status.COMPLETED,
                'notes': 'Urgent tactical squad reinforcement at Bravo Base.'
            },
            {
                'from_base': bases['Alpha Base'],
                'to_base': bases['Charlie Base'],
                'equipment_type': equipments['Tactical Utility Vehicle 4x4'],
                'quantity': 2,
                'transfer_date': today - timedelta(days=5),
                'reference_number': 'TRF-2026-002',
                'status': Transfer.Status.COMPLETED,
                'notes': 'Coastal patrol vehicle re-assignment.'
            },
            {
                'from_base': bases['Alpha Base'],
                'to_base': bases['Charlie Base'],
                'equipment_type': equipments['Tactical VHF/UHF Field Radio'],
                'quantity': 10,
                'transfer_date': today - timedelta(days=3),
                'reference_number': 'TRF-2026-003',
                'status': Transfer.Status.COMPLETED,
                'notes': 'Radio relay equipment distribution.'
            },
            {
                'from_base': bases['Bravo Base'],
                'to_base': bases['Alpha Base'],
                'equipment_type': equipments['Heavy Machine Gun .50 Cal'],
                'quantity': 2,
                'transfer_date': today - timedelta(days=1),
                'reference_number': 'TRF-2026-004',
                'status': Transfer.Status.PENDING,
                'notes': 'Scheduled equipment maintenance return.'
            },
        ]

        for t_data in transfers_seed:
            transfer, created = Transfer.objects.get_or_create(
                reference_number=t_data['reference_number'],
                defaults={**t_data, 'created_by': logistics_user}
            )
            if created and transfer.status == Transfer.Status.COMPLETED:
                src_inv = Inventory.objects.get(base=transfer.from_base, equipment_type=transfer.equipment_type)
                src_inv.quantity -= transfer.quantity
                src_inv.save()

                dest_inv, _ = Inventory.objects.get_or_create(
                    base=transfer.to_base,
                    equipment_type=transfer.equipment_type,
                    defaults={'quantity': 0}
                )
                dest_inv.quantity += transfer.quantity
                dest_inv.save()

                AuditLog.objects.create(
                    user=logistics_user,
                    action=AuditLog.Action.TRANSFER,
                    entity_type='Transfer',
                    entity_id=str(transfer.id),
                    description=f"Transfer {transfer.reference_number}: {transfer.quantity} {transfer.equipment_type.name} from {transfer.from_base.name} to {transfer.to_base.name}.",
                    metadata={'status': transfer.status},
                    ip_address='127.0.0.1'
                )

        print(f"Transfers seeded.")

        # 6. Assignments (Active and Returned)
        assignments_seed = [
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['Service Assault Rifle 5.56mm'],
                'quantity': 1,
                'personnel_name': 'Sgt. John Connor',
                'personnel_identifier': 'ID-88219',
                'assignment_date': today - timedelta(days=14),
                'status': Assignment.Status.ACTIVE,
                'notes': 'Standard issue service rifle for perimeter patrol.'
            },
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['Advanced Combat Ballistic Helmet'],
                'quantity': 1,
                'personnel_name': 'Sgt. John Connor',
                'personnel_identifier': 'ID-88219',
                'assignment_date': today - timedelta(days=14),
                'status': Assignment.Status.ACTIVE,
                'notes': 'Protective gear issue.'
            },
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['Tactical VHF/UHF Field Radio'],
                'quantity': 1,
                'personnel_name': 'Cpl. David Miller',
                'personnel_identifier': 'ID-90412',
                'assignment_date': today - timedelta(days=10),
                'status': Assignment.Status.ACTIVE,
                'notes': 'Recon team radio operator equipment.'
            },
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['Tactical Utility Vehicle 4x4'],
                'quantity': 1,
                'personnel_name': 'Lt. Elena Rostova',
                'personnel_identifier': 'ID-76344',
                'assignment_date': today - timedelta(days=12),
                'status': Assignment.Status.ACTIVE,
                'notes': 'Assigned command patrol vehicle.'
            },
            {
                'base': bases['Bravo Base'],
                'equipment_type': equipments['Service Assault Rifle 5.56mm'],
                'quantity': 1,
                'personnel_name': 'Pvt. Alex Bennett',
                'personnel_identifier': 'ID-45120',
                'assignment_date': today - timedelta(days=6),
                'status': Assignment.Status.ACTIVE,
                'notes': 'Frontline guard assignment.'
            },
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['Service Assault Rifle 5.56mm'],
                'quantity': 1,
                'personnel_name': 'Pvt. James Kelly',
                'personnel_identifier': 'ID-33901',
                'assignment_date': today - timedelta(days=20),
                'status': Assignment.Status.RETURNED,
                'notes': 'Returned to armory upon completion of tour.'
            },
        ]

        for a_data in assignments_seed:
            assign, created = Assignment.objects.get_or_create(
                personnel_identifier=a_data['personnel_identifier'],
                equipment_type=a_data['equipment_type'],
                assignment_date=a_data['assignment_date'],
                defaults={**a_data, 'assigned_by': commander_user}
            )
            if created:
                AuditLog.objects.create(
                    user=commander_user,
                    action=AuditLog.Action.ASSIGN,
                    entity_type='Assignment',
                    entity_id=str(assign.id),
                    description=f"Assigned {assign.quantity} {assign.equipment_type.name} to {assign.personnel_name} at {assign.base.name}.",
                    metadata={'status': assign.status},
                    ip_address='127.0.0.1'
                )

        print(f"Assignments seeded.")

        # 7. Expenditures (validate inventory, decrement inventory, audit)
        expenditures_seed = [
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['5.56mm NATO Ammunition Crate (1000 rounds)'],
                'quantity': 25,
                'expenditure_date': today - timedelta(days=9),
                'reason': 'Annual Battalion Live-Fire Tactical Qualification',
                'reference_number': 'EXP-2026-001',
                'notes': 'Authorized training consumption.'
            },
            {
                'base': bases['Alpha Base'],
                'equipment_type': equipments['5.56mm NATO Ammunition Crate (1000 rounds)'],
                'quantity': 15,
                'expenditure_date': today - timedelta(days=4),
                'reason': 'Perimeter Defense Range Practice',
                'reference_number': 'EXP-2026-002',
                'notes': 'Squad marksmanship qualification.'
            },
            {
                'base': bases['Bravo Base'],
                'equipment_type': equipments['Service Assault Rifle 5.56mm'],
                'quantity': 2,
                'expenditure_date': today - timedelta(days=2),
                'reason': 'Combat Irreparable Damage & Destruction',
                'reference_number': 'EXP-2026-003',
                'notes': 'Written off following tactical vehicle breach incident.'
            },
        ]

        for e_data in expenditures_seed:
            exp, created = Expenditure.objects.get_or_create(
                reference_number=e_data['reference_number'],
                defaults={**e_data, 'recorded_by': commander_user}
            )
            if created:
                inv = Inventory.objects.get(base=exp.base, equipment_type=exp.equipment_type)
                inv.quantity -= exp.quantity
                inv.save()

                AuditLog.objects.create(
                    user=commander_user,
                    action=AuditLog.Action.EXPEND,
                    entity_type='Expenditure',
                    entity_id=str(exp.id),
                    description=f"Expended {exp.quantity} {exp.equipment_type.name} at {exp.base.name} ({exp.reason}).",
                    metadata={'reference_number': exp.reference_number, 'quantity': exp.quantity},
                    ip_address='127.0.0.1'
                )

        print(f"Expenditures seeded.")

        # Additional Audit logs for user creation / login
        AuditLog.objects.get_or_create(
            action=AuditLog.Action.LOGIN,
            description="User admin@example.com logged in.",
            defaults={'user': admin_user, 'entity_type': 'User', 'entity_id': str(admin_user.id), 'ip_address': '127.0.0.1'}
        )

    print("Database seeding completed successfully!")

if __name__ == '__main__':
    seed()
