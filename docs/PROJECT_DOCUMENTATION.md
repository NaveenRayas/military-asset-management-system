# Military Asset Management System - Project Documentation

A comprehensive, defense-grade inventory and logistics tracking web application designed to maintain operational readiness, transparency, and accounting accuracy across multi-base defense installations.

---

## 1. Project Overview

### Purpose
The Military Asset Management System (MAMS) is an enterprise-grade logistics and inventory tracking platform designed for armed forces and defense commands. It enforces end-to-end accountability for military equipment, vehicles, armaments, communications hardware, and ammunition across diverse operational bases.

### Problem Being Solved
Military supply chains face significant friction, discrepancies, and security risks when tracking asset movements across geographically dispersed command stations:
- **Discrepancies in Stock**: Traditional spreadsheets or unconstrained databases risk negative inventory, unrecorded loss, or ghost assets.
- **Logistics Accountability**: Inter-base asset transfers often lack atomic validation, resulting in equipment vanishing in transit or being credited simultaneously at both bases.
- **Clearance & Security Leakage**: Base commanders must not access inventory data of unrelated bases, while senior command requires global visibility.
- **Audit Deficiencies**: Critical military actions (procurements, expenditures, role changes) require tamper-proof, append-only logs for inspection and legal compliance.

### Features
1. **Dynamic Real-Time Inventory Tracking**: Automatic inventory deduction and incrementation with zero possibility of negative stock.
2. **Atomic Inter-Base Transfers**: Transfers validate stock at origin base in a database transaction (`transaction.atomic`) before debiting source and crediting destination.
3. **Personnel Field Assignments**: Separates physical inventory ownership from personnel assignment (assigned assets remain accounted for on base balance sheets).
4. **Authorized Expenditures**: Records expended or destroyed assets with audit verification.
5. **Dynamic Dashboard Accounting**: Live computation of:
   $$\text{Closing Balance} = \text{Opening Balance} + \text{Purchases} + \text{Transfer In} - \text{Transfer Out} - \text{Expenditures}$$
   $$\text{Net Movement} = \text{Purchases} + \text{Transfer In} - \text{Transfer Out}$$
6. **Net Movement Analysis Modal**: Interactive drill-down modal showcasing granular transactional records and equation breakdown.
7. **Strict Role-Based Access Control (RBAC)**: Backend-enforced permissions (`ADMIN`, `BASE_COMMANDER`, `LOGISTICS_OFFICER`).
8. **Tamper-Proof Audit Trails**: Append-only log recording IP addresses, operator IDs, timestamps, actions, and raw JSON payloads.
9. **Interactive OpenAPI / Swagger Documentation**: Available at `/api/docs/`.

### Assumptions
- Equipment is accounted for in standardized discrete units (e.g., rifles, vehicles, crates).
- Base Commanders manage assets within their designated home base and cannot unilaterally manipulate other command stations.
- Transfers occur immediately or via monitored dispatch status (`COMPLETED`, `PENDING`, `CANCELLED`).

### Limitations
- The system currently focuses on inventory units and valuation rather than real-time GPS hardware telematics.
- Hardware RFID scanner hardware drivers are simulated via RESTful barcode/reference identifier ingestion.

---

## 2. Tech Stack & Architecture

### Technology Stack
- **Frontend**: React 18, Vite, React Router DOM, Axios, Tailwind CSS, Recharts, Lucide React.
  - *Why selected*: High performance, reactive single-page architecture, responsive modern design system suitable for mission-critical command centers.
- **Backend**: Python 3.12, Django 5.1, Django REST Framework (DRF), SimpleJWT.
  - *Why selected*: Battle-tested ORM, robust database transaction handling (`transaction.atomic`), rock-solid security defaults, and rapid serialization.
- **Database**: PostgreSQL (with SQLite fallback for local zero-dependency testing via `dj-database-url`).
  - *Why selected*: ACID compliance, row-level locking (`select_for_update`), check constraints, and relational integrity.
- **Authentication**: JWT (JSON Web Tokens) with access and refresh tokens.
  - *Why selected*: Stateless authentication across distributed nodes with short-lived access credentials.
- **Deployment**: Vercel (Frontend SPA) & Render (Backend Web Service + Managed PostgreSQL).
  - *Why selected*: Seamless CI/CD git-push deployments, automatic SSL termination, and horizontal scalability.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER                                │
│                     React 18 SPA (Vite + Tailwind)                      │
│                                                                         │
│   [AuthContext]   [ToastContext]   [Recharts]   [Role-Gated Routes]     │
│         │                                               │               │
│         └───────────────────────┬───────────────────────┘               │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │ HTTPS / REST (Bearer JWT)
┌─────────────────────────────────▼───────────────────────────────────────┐
│                            API GATEWAY LAYER                            │
│                       Django REST Framework (DRF)                       │
│                                                                         │
│   [SimpleJWT Auth]   [WhiteNoise Static]   [drf-spectacular OpenAPI]    │
│   [RBAC Permissions: IsAdmin | IsBaseCommander | IsLogisticsOfficer]    │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                          BUSINESS LOGIC APPS                            │
│                                                                         │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│   │   Bases     │ │  Equipment  │ │  Purchases  │ │  Transfers  │       │
│   └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│   │ Assignments │ │Expenditures │ │  Dashboard  │ │  Audit Logs │       │
│   └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ Atomic Transactions (Locks & Queries)
┌─────────────────────────────────▼───────────────────────────────────────┐
│                            PERSISTENCE LAYER                            │
│                  PostgreSQL Relational Storage (Render)                 │
│                                                                         │
│   - Check Constraints: quantity >= 0, from_base != to_base             │
│   - Unique Constraints: base + equipment_type, reference_number         │
│   - Append-Only Audit Records with Raw Metadata JSONB                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Models / Schema

### Model Specifications & Relationships

1. **`User` (Custom Auth Model)**:
   - `id`: BigAutoField (PK)
   - `email`: EmailField (Unique, USERNAME_FIELD)
   - `username`: CharField
   - `role`: CharField (`ADMIN`, `BASE_COMMANDER`, `LOGISTICS_OFFICER`)
   - `base`: ForeignKey -> `Base` (null=True, blank=True, on_delete=SET_NULL)
   - `is_active`: BooleanField (supports safe deactivation)

2. **`Base`**:
   - `id`: BigAutoField (PK)
   - `name`: CharField (Unique)
   - `code`: CharField (Unique, e.g., `BASE-ALPHA`)
   - `location`: CharField
   - `description`: TextField
   - `is_active`: BooleanField

3. **`EquipmentType`**:
   - `id`: BigAutoField (PK)
   - `name`: CharField (Unique)
   - `category`: CharField (`Vehicle`, `Weapon`, `Ammunition`, `Communication`, `Protective Equipment`, `Other`)
   - `unit`: CharField (e.g., `units`, `crates`, `rifles`)
   - `description`: TextField

4. **`Inventory`**:
   - `id`: BigAutoField (PK)
   - `base`: ForeignKey -> `Base` (on_delete=CASCADE)
   - `equipment_type`: ForeignKey -> `EquipmentType` (on_delete=CASCADE)
   - `quantity`: IntegerField (CheckConstraint: `quantity >= 0`)
   - *Constraint*: `unique_together = ('base', 'equipment_type')`

5. **`Purchase`**:
   - `id`: BigAutoField (PK)
   - `base`: ForeignKey -> `Base`
   - `equipment_type`: ForeignKey -> `EquipmentType`
   - `quantity`: PositiveIntegerField
   - `purchase_date`: DateField
   - `reference_number`: CharField (Unique)
   - `supplier`: CharField
   - `unit_cost`: DecimalField
   - `total_cost`: DecimalField (computed: `quantity * unit_cost`)
   - `created_by`: ForeignKey -> `User`

6. **`Transfer`**:
   - `id`: BigAutoField (PK)
   - `from_base`: ForeignKey -> `Base` (outgoing)
   - `to_base`: ForeignKey -> `Base` (incoming)
   - `equipment_type`: ForeignKey -> `EquipmentType`
   - `quantity`: PositiveIntegerField
   - `transfer_date`: DateField
   - `reference_number`: CharField (Unique)
   - `status`: CharField (`PENDING`, `COMPLETED`, `CANCELLED`)
   - *Constraint*: `CheckConstraint: from_base != to_base`

7. **`Assignment`**:
   - `id`: BigAutoField (PK)
   - `base`: ForeignKey -> `Base`
   - `equipment_type`: ForeignKey -> `EquipmentType`
   - `quantity`: PositiveIntegerField
   - `personnel_name`: CharField
   - `personnel_identifier`: CharField (Badge/Service ID)
   - `assignment_date`: DateField
   - `status`: CharField (`ACTIVE`, `RETURNED`, `CANCELLED`)
   - `assigned_by`: ForeignKey -> `User`

8. **`Expenditure`**:
   - `id`: BigAutoField (PK)
   - `base`: ForeignKey -> `Base`
   - `equipment_type`: ForeignKey -> `EquipmentType`
   - `quantity`: PositiveIntegerField
   - `expenditure_date`: DateField
   - `reason`: CharField
   - `reference_number`: CharField (Unique)
   - `recorded_by`: ForeignKey -> `User`

9. **`AuditLog`**:
   - `id`: BigAutoField (PK)
   - `user`: ForeignKey -> `User` (null=True)
   - `action`: CharField (`LOGIN`, `LOGOUT`, `CREATE`, `UPDATE`, `DELETE`, `PURCHASE`, `TRANSFER`, `ASSIGN`, `EXPEND`, `USER_ROLE_CHANGE`)
   - `entity_type`: CharField
   - `entity_id`: CharField
   - `description`: TextField
   - `metadata`: JSONField
   - `ip_address`: CharField
   - `timestamp`: DateTimeField

---

## 4. RBAC Explanation

The application implements strict Role-Based Access Control enforced at the **backend API viewset layer**, independent of frontend UI state.

| Role | Access Scope | Allowed Operations | Restricted Operations |
|---|---|---|---|
| **ADMIN** | System-wide (All Bases) | Full CRUD on Bases, Equipment Types, Users, Purchases, Transfers, Assignments, Expenditures, Audit Logs, and Global Dashboard. | Cannot delete own account; cannot tamper with audit logs. |
| **BASE_COMMANDER** | Assigned Base Only | View dashboard, inventory, purchases, transfers, assignments, expenditures, and audit logs **for their assigned base**. Create purchases, transfers involving their base, assignments, and expenditures. | Cannot access unrelated bases; cannot manage users; cannot alter equipment catalog; cannot delete audit logs. |
| **LOGISTICS_OFFICER** | Logistics Workflow | View inventory across bases; create purchases; initiate and manage transfers; view audit logs and logistics metrics. | Cannot manage users or user roles; cannot edit system settings; cannot delete audit logs. |

### Backend Permission Classes (`apps/accounts/permissions.py`)
- `IsAdmin`: Validates `request.user.role == 'ADMIN' or is_superuser`.
- `IsBaseCommander`: Validates `request.user.role == 'BASE_COMMANDER'`.
- `IsLogisticsOfficer`: Validates `request.user.role == 'LOGISTICS_OFFICER'`.
- `IsAdminOrReadOnly`: Allows `GET/HEAD/OPTIONS` to any authenticated user, restricting write verbs to Admins.
- `CanAccessBase`: Validates that the requested base object or foreign key matches the Commander's assigned `user.base_id`.

---

## 5. API Logging

Every state-changing military transaction generates an immutable audit record in the database.

### Audit Service Function
```python
create_audit_log(
    user=request.user,
    action=AuditLog.Action.PURCHASE,
    entity_type='Purchase',
    entity_id=purchase.id,
    description="Recorded purchase PUR-2026-001: +50 Service Rifles to Alpha Base",
    metadata={
        'reference_number': 'PUR-2026-001',
        'quantity': 50,
        'total_cost': '42500.00'
    },
    request=request
)
```

### Logged Events
1. **User Authentication**: Logins and logouts recorded with IP address.
2. **Purchases**: Inbound quantities, reference, cost, supplier.
3. **Transfers**: Route (`from_base -> to_base`), quantities, status updates.
4. **Assignments**: Recipient personnel name, ID, status changes (Active -> Returned).
5. **Expenditures**: Material write-offs, live-fire consumption, operational reasons.
6. **User Administration**: New officer provisioning and role modifications (`USER_ROLE_CHANGE`).
7. **Bases & Equipment**: Creation, modification, and deactivation.

---

## 6. Setup Instructions

### Prerequisites
- Python 3.12+ installed
- Node.js 18+ and npm installed
- PostgreSQL 14+ (or default SQLite for instant zero-dependency execution)

### 1. Backend Setup
```powershell
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1    # On Windows
# source venv/bin/activate     # On Linux / macOS

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env
cp .env.example .env

# Run database migrations
python manage.py migrate

# Seed database with demo bases, users, inventory & transactions
python manage.py seed_data

# Start backend development server (Runs on port 8000)
python manage.py runserver 8000
```

### 2. Frontend Setup
```powershell
# Open a new terminal and navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Copy environment example
cp .env.example .env

# Start Vite development server (Runs on port 5173)
npm run dev
```

---

## 7. API Endpoints

Interactive Swagger UI documentation is available at `http://localhost:8000/api/docs/`.

### Key Endpoints

| Method | Endpoint | Authentication | Purpose | Sample Request Body / Parameters |
|---|---|---|---|---|
| `POST` | `/api/auth/login/` | None | Authenticate user & issue JWT | `{"email": "admin@example.com", "password": "..."}` |
| `GET` | `/api/auth/me/` | Bearer JWT | Retrieve active user profile | None |
| `POST` | `/api/auth/logout/` | Bearer JWT | Blacklist refresh token | `{"refresh": "<refresh_token>"}` |
| `GET` | `/api/bases/` | Bearer JWT | List military bases (role-scoped) | `?search=Alpha` |
| `POST` | `/api/bases/` | Admin only | Commission a new base | `{"name": "Delta Base", "code": "BASE-D", "location": "Sector 3"}` |
| `GET` | `/api/equipment/` | Bearer JWT | List equipment catalog | `?category=Weapon` |
| `GET` | `/api/inventory/` | Bearer JWT | Query live base inventories | `?base_id=1&category=Vehicle` |
| `GET` | `/api/purchases/` | Bearer JWT | Query purchase history | `?base_id=1&date_from=2026-01-01` |
| `POST` | `/api/purchases/` | Bearer JWT | Record purchase & increment stock | `{"base": 1, "equipment_type": 1, "quantity": 10, ...}` |
| `GET` | `/api/transfers/` | Bearer JWT | Query inter-base transfers | `?status=COMPLETED` |
| `POST` | `/api/transfers/` | Bearer JWT | Dispatch atomic asset transfer | `{"from_base": 1, "to_base": 2, "quantity": 5, ...}` |
| `GET` | `/api/assignments/`| Bearer JWT | List personnel assignments | `?status=ACTIVE` |
| `POST` | `/api/assignments/`| Bearer JWT | Issue equipment to personnel | `{"base": 1, "personnel_name": "Sgt. Smith", ...}` |
| `POST` | `/api/expenditures/`| Bearer JWT | Record material expenditure | `{"base": 1, "equipment_type": 5, "quantity": 10, ...}` |
| `GET` | `/api/dashboard/summary/` | Bearer JWT | Dynamic KPI metrics & charts | `?base_id=1&date_from=2026-01-01` |
| `GET` | `/api/dashboard/net-movement/` | Bearer JWT | Detailed net movement analysis | `?base_id=1` |
| `GET` | `/api/users/` | Admin only | User accounts management | None |
| `GET` | `/api/audit-logs/` | Bearer JWT | Append-only security audit log | `?action=PURCHASE` |

---

## 8. Login Credentials

> [!IMPORTANT]
> The credentials below are pre-configured **DEMO CREDENTIALS** created by the database seed command. In a live production environment, passwords must be rotated immediately via environment variables or Django admin.

### 1. ADMIN (System-Wide Full Clearance)
- **Email**: `admin@example.com`
- **Password**: `Admin@12345`
- **Role**: `ADMIN`
- **Capabilities**: Full access to all bases, user management, equipment catalog, purchases, transfers, and system audit logs.

### 2. BASE COMMANDER (Alpha Base Scope)
- **Email**: `commander@example.com`
- **Password**: `Commander@12345`
- **Role**: `BASE_COMMANDER`
- **Assigned Base**: `Alpha Base` (`BASE-ALPHA`)
- **Capabilities**: Access restricted exclusively to Alpha Base inventory, personnel assignments, local expenditures, and unit movements.

### 3. LOGISTICS OFFICER (Supply Chain Officer)
- **Email**: `logistics@example.com`
- **Password**: `Logistics@12345`
- **Role**: `LOGISTICS_OFFICER`
- **Capabilities**: Manages procurement requisitions and inter-base transfers across stations. Restricted from user administration and system configuration.
