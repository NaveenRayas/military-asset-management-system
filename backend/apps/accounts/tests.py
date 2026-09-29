from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date

from apps.accounts.models import User
from apps.bases.models import Base
from apps.equipment.models import EquipmentType, Inventory
from apps.purchases.models import Purchase
from apps.transfers.models import Transfer
from apps.assignments.models import Assignment
from apps.expenditures.models import Expenditure
from apps.audit.models import AuditLog

class MilitaryAssetManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Create Bases
        self.base_alpha = Base.objects.create(name='Alpha Base', code='BASE-A', location='Sector 1')
        self.base_bravo = Base.objects.create(name='Bravo Base', code='BASE-B', location='Sector 2')

        # 2. Create Users
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='Admin@12345',
            username='admin',
            role=User.Role.ADMIN
        )
        self.commander_user = User.objects.create_user(
            email='commander@example.com',
            password='Commander@12345',
            username='commander',
            role=User.Role.BASE_COMMANDER,
            base=self.base_alpha
        )
        self.logistics_user = User.objects.create_user(
            email='logistics@example.com',
            password='Logistics@12345',
            username='logistics',
            role=User.Role.LOGISTICS_OFFICER,
            base=self.base_alpha
        )

        # 3. Create Equipment
        self.rifle = EquipmentType.objects.create(
            name='Service Assault Rifle 5.56mm',
            category=EquipmentType.Category.WEAPON,
            unit='rifles'
        )

    def test_01_authentication_login_and_me(self):
        # Valid login
        resp = self.client.post('/api/auth/login/', {
            'email': 'admin@example.com',
            'password': 'Admin@12345'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        access_token = resp.data['access']

        # Invalid login
        bad_resp = self.client.post('/api/auth/login/', {
            'email': 'admin@example.com',
            'password': 'WrongPassword!'
        })
        self.assertEqual(bad_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Authenticated Me endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        me_resp = self.client.get('/api/auth/me/')
        self.assertEqual(me_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(me_resp.data['email'], 'admin@example.com')
        self.assertEqual(me_resp.data['role'], 'ADMIN')

    def test_02_rbac_user_management_restrictions(self):
        # Logistics Officer cannot access /api/users/ (Should be 403)
        self.client.force_authenticate(user=self.logistics_user)
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Base Commander cannot access /api/users/ (Should be 403)
        self.client.force_authenticate(user=self.commander_user)
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Admin CAN access /api/users/
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_03_base_commander_scoped_base_access(self):
        # Base Commander can only see their assigned base
        self.client.force_authenticate(user=self.commander_user)
        resp = self.client.get('/api/bases/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get('results', resp.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], self.base_alpha.id)

    def test_04_atomic_purchase_and_inventory_increment(self):
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.post('/api/purchases/', {
            'base': self.base_alpha.id,
            'equipment_type': self.rifle.id,
            'quantity': 50,
            'purchase_date': str(date.today()),
            'reference_number': 'TEST-PUR-001',
            'supplier': 'Test Arms Ltd',
            'unit_cost': '500.00',
            'notes': 'Test order'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(resp.data['total_cost']), Decimal('25000.00'))

        # Verify inventory was automatically created/incremented
        inv = Inventory.objects.get(base=self.base_alpha, equipment_type=self.rifle)
        self.assertEqual(inv.quantity, 50)

        # Verify audit log was created
        log = AuditLog.objects.filter(action=AuditLog.Action.PURCHASE, entity_id=resp.data['id']).first()
        self.assertIsNotNone(log)

    def test_05_atomic_transfer_and_insufficient_inventory(self):
        self.client.force_authenticate(user=self.admin_user)

        # Setup 20 rifles at Alpha
        Inventory.objects.create(base=self.base_alpha, equipment_type=self.rifle, quantity=20)

        # 1. Attempt transfer with same source and destination (should fail)
        same_base_resp = self.client.post('/api/transfers/', {
            'from_base': self.base_alpha.id,
            'to_base': self.base_alpha.id,
            'equipment_type': self.rifle.id,
            'quantity': 5,
            'transfer_date': str(date.today()),
            'reference_number': 'TEST-TRF-SAME'
        })
        self.assertEqual(same_base_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Attempt transfer of 30 rifles when only 20 exist (insufficient inventory)
        insufficient_resp = self.client.post('/api/transfers/', {
            'from_base': self.base_alpha.id,
            'to_base': self.base_bravo.id,
            'equipment_type': self.rifle.id,
            'quantity': 30,
            'transfer_date': str(date.today()),
            'reference_number': 'TEST-TRF-OVER'
        })
        self.assertEqual(insufficient_resp.status_code, status.HTTP_400_BAD_REQUEST)
        # Source inventory remains untouched
        self.assertEqual(Inventory.objects.get(base=self.base_alpha, equipment_type=self.rifle).quantity, 20)

        # 3. Valid transfer of 15 rifles
        valid_resp = self.client.post('/api/transfers/', {
            'from_base': self.base_alpha.id,
            'to_base': self.base_bravo.id,
            'equipment_type': self.rifle.id,
            'quantity': 15,
            'transfer_date': str(date.today()),
            'reference_number': 'TEST-TRF-VALID'
        })
        self.assertEqual(valid_resp.status_code, status.HTTP_201_CREATED)

        # Source decreases, destination increases
        self.assertEqual(Inventory.objects.get(base=self.base_alpha, equipment_type=self.rifle).quantity, 5)
        self.assertEqual(Inventory.objects.get(base=self.base_bravo, equipment_type=self.rifle).quantity, 15)

    def test_06_atomic_expenditure_and_reductions(self):
        self.client.force_authenticate(user=self.admin_user)
        Inventory.objects.create(base=self.base_alpha, equipment_type=self.rifle, quantity=10)

        # Attempt to expend more than exists
        fail_resp = self.client.post('/api/expenditures/', {
            'base': self.base_alpha.id,
            'equipment_type': self.rifle.id,
            'quantity': 15,
            'expenditure_date': str(date.today()),
            'reason': 'Live fire',
            'reference_number': 'TEST-EXP-FAIL'
        })
        self.assertEqual(fail_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid expenditure of 4
        success_resp = self.client.post('/api/expenditures/', {
            'base': self.base_alpha.id,
            'equipment_type': self.rifle.id,
            'quantity': 4,
            'expenditure_date': str(date.today()),
            'reason': 'Live fire qualification',
            'reference_number': 'TEST-EXP-PASS'
        })
        self.assertEqual(success_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Inventory.objects.get(base=self.base_alpha, equipment_type=self.rifle).quantity, 6)

    def test_07_dashboard_balance_calculation_formulas(self):
        self.client.force_authenticate(user=self.admin_user)

        # 1. Prior purchase: 100 rifles (prior to date_from)
        Purchase.objects.create(
            base=self.base_alpha,
            equipment_type=self.rifle,
            quantity=100,
            purchase_date='2026-01-01',
            reference_number='DASH-P-1',
            supplier='Supplier A',
            unit_cost=Decimal('100.00'),
            created_by=self.admin_user
        )
        # 2. Period purchase: 50 rifles (inside period 2026-02-01 to 2026-02-28)
        Purchase.objects.create(
            base=self.base_alpha,
            equipment_type=self.rifle,
            quantity=50,
            purchase_date='2026-02-10',
            reference_number='DASH-P-2',
            supplier='Supplier A',
            unit_cost=Decimal('100.00'),
            created_by=self.admin_user
        )
        # 3. Period transfer in to Alpha: 20
        Transfer.objects.create(
            from_base=self.base_bravo,
            to_base=self.base_alpha,
            equipment_type=self.rifle,
            quantity=20,
            transfer_date='2026-02-12',
            reference_number='DASH-T-1',
            status=Transfer.Status.COMPLETED,
            created_by=self.admin_user
        )
        # 4. Period transfer out of Alpha: 10
        Transfer.objects.create(
            from_base=self.base_alpha,
            to_base=self.base_bravo,
            equipment_type=self.rifle,
            quantity=10,
            transfer_date='2026-02-15',
            reference_number='DASH-T-2',
            status=Transfer.Status.COMPLETED,
            created_by=self.admin_user
        )
        # 5. Period expenditure: 5
        Expenditure.objects.create(
            base=self.base_alpha,
            equipment_type=self.rifle,
            quantity=5,
            expenditure_date='2026-02-18',
            reason='Training',
            reference_number='DASH-E-1',
            recorded_by=self.admin_user
        )

        resp = self.client.get(
            f'/api/dashboard/summary/?base_id={self.base_alpha.id}&date_from=2026-02-01&date_to=2026-02-28'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        kpis = resp.data['kpis']

        # Opening Balance = 100
        self.assertEqual(kpis['opening_balance'], 100)
        # Purchases in period = 50
        self.assertEqual(kpis['purchases'], 50)
        # Transfer In = 20
        self.assertEqual(kpis['transfer_in'], 20)
        # Transfer Out = 10
        self.assertEqual(kpis['transfer_out'], 10)
        # Net Movement = Purchases + Transfer In - Transfer Out = 50 + 20 - 10 = 60
        self.assertEqual(kpis['net_movement'], 60)
        # Expended = 5
        self.assertEqual(kpis['expended'], 5)
        # Closing Balance = Opening + Net Movement - Expended = 100 + 60 - 5 = 155
        self.assertEqual(kpis['closing_balance'], 155)

    def test_08_audit_logs_read_only_immutability(self):
        log = AuditLog.objects.create(
            user=self.admin_user,
            action=AuditLog.Action.CREATE,
            entity_type='Test',
            entity_id='1',
            description='Immutable test log.'
        )

        self.client.force_authenticate(user=self.admin_user)
        # Attempt to delete audit log (should be 405 Method Not Allowed)
        del_resp = self.client.delete(f'/api/audit-logs/{log.id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Attempt to modify audit log (should be 405 Method Not Allowed)
        put_resp = self.client.put(f'/api/audit-logs/{log.id}/', {'description': 'tampered'})
        self.assertEqual(put_resp.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
