# Military Asset Management System (MAMS)

A complete, production-grade defense logistics and asset management platform for tracking military equipment across bases, handling procurements, inter-base transfers, personnel assignments, material expenditures, balances, and tamper-proof audit trails.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Architecture & Calculation Logic](#architecture--calculation-logic)
5. [Directory Structure](#directory-structure)
6. [Prerequisites](#prerequisites)
7. [Local Setup & Installation](#local-setup--installation)
   - [Backend Setup](#1-backend-setup)
   - [Database Setup & Seeding](#2-database-setup--seeding)
   - [Frontend Setup](#3-frontend-setup)
8. [Demo Login Credentials](#demo-login-credentials)
9. [Running Automated Tests](#running-automated-tests)
10. [Interactive API Documentation](#interactive-api-documentation)
11. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
12. [Deployment Guide](#deployment-guide)
    - [Backend Deployment (Render)](#backend-render-deployment)
    - [Frontend Deployment (Vercel)](#frontend-vercel-deployment)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview
The **Military Asset Management System** is built to solve operational tracking challenges across multi-sector defense bases. By enforcing relational integrity, database check constraints, and atomic operations (`transaction.atomic`), the system guarantees that inventory is never negative, equipment cannot disappear in transit, and unauthorized users cannot access command data outside their clearance.

---

## Key Features
- **Atomic Procurement**: Purchases automatically calculate total expenditure, create purchase records, increment base inventory, and log audit trails.
- **Atomic Transfers**: Moving equipment between bases validates origin inventory availability, debits origin, and credits destination in a single database transaction.
- **Personnel Field Issue**: Assets issued to troops are tracked as active assignments without deleting them from overall base possession.
- **Authorized Expenditures**: Consumed munitions and decommissioned equipment reduce inventory with logged operational justifications.
- **Live Dynamic Accounting**:
  - $\text{Closing Balance} = \text{Opening Balance} + \text{Purchases} + \text{Transfer In} - \text{Transfer Out} - \text{Expenditures}$
  - $\text{Net Movement} = \text{Purchases} + \text{Transfer In} - \text{Transfer Out}$
- **Interactive Net Movement Modal**: Click on the Net Movement dashboard card to inspect exact mathematical equations and transaction manifests.
- **Cryptographic Audit Trail**: Immutable append-only ledger tracking all actions, IP addresses, operator accounts, and raw JSON payloads.
- **Role-Based Clearance**: Admin, Base Commander, and Logistics Officer scopes enforced strictly on the backend.
- **Responsive Tactical UI**: Built with React, Tailwind CSS, and Recharts, optimized for mobile drawers, tablet grids, and desktop command centers.

---

## Tech Stack
- **Frontend**: React 18, Vite, React Router DOM, Axios, Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: Python 3.12, Django 5.1, Django REST Framework (DRF), SimpleJWT, WhiteNoise, drf-spectacular.
- **Database**: PostgreSQL (with SQLite fallback via `dj-database-url` for instant local execution).
- **Deployment**: Vercel (Frontend SPA) + Render (Backend Web Service & Managed PostgreSQL).

---

## Architecture & Calculation Logic

```
   ┌──────────────────────────────────────────────────────────────┐
   │              React 18 SPA (Vite + Tailwind CSS)             │
   │  - Recharts Visualizations    - Toast Notification Context   │
   │  - JWT Auth Interceptors      - Role-Gated Dynamic Views     │
   └──────────────────────────────┬───────────────────────────────┘
                                  │ HTTPS REST (Bearer JWT)
   ┌──────────────────────────────▼───────────────────────────────┐
   │             Django 5.1 REST Framework (DRF Backend)          │
   │  - SimpleJWT Auth Engine      - Reusable RBAC Permission Set │
   │  - Atomic Transactions        - Append-Only Audit Logging    │
   │  - drf-spectacular OpenAPI    - Dynamic Accounting Engine    │
   └──────────────────────────────┬───────────────────────────────┘
                                  │ PostgreSQL / SQLite
   ┌──────────────────────────────▼───────────────────────────────┐
   │                   Relational Persistence                     │
   │  - Check Constraints: quantity >= 0, from_base != to_base    │
   │  - Unique Constraints: (base, equipment_type)                │
   └──────────────────────────────────────────────────────────────┘
```

---

## Directory Structure
```
military-asset-management/
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/
│   │   ├── accounts/          # Custom User, JWT Auth, RBAC permissions
│   │   ├── bases/             # Military Base stations
│   │   ├── equipment/         # Armament catalog & live inventories
│   │   ├── purchases/         # Requisitions & inbound procurement
│   │   ├── transfers/         # Inter-base atomic transfers
│   │   ├── assignments/       # Personnel equipment issue
│   │   ├── expenditures/      # Munitions consumption & damage logs
│   │   ├── dashboard/         # Real-time balance calculations & charts
│   │   └── audit/             # Append-only cryptographic ledger
│   └── database/
│       └── seed_data.py       # Standalone & CLI seed script
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/               # Axios client with JWT refresh interceptors
│       ├── components/        # Common UI & Dashboard widgets
│       ├── layouts/           # Responsive Sidebar & Topbar
│       ├── pages/             # All operational views
│       ├── context/           # Auth and Toast Providers
│       └── styles/            # Tailwind base directives
│
├── database/
│   └── database_dump.sql      # Full PostgreSQL DDL schema & seed data
├── docs/
│   └── PROJECT_DOCUMENTATION.md
├── render.yaml                # Render Infrastructure-as-Code blueprint
├── README.md
└── .gitignore
```

---

## Prerequisites
- **Python**: Version 3.12+
- **Node.js**: Version 18+ and npm
- **Database**: PostgreSQL 14+ (or default SQLite for zero-dependency local setup)

---

## Local Setup & Installation

### 1. Backend Setup
```powershell
# 1. Open a terminal and enter the backend directory
cd backend

# 2. Create Python virtual environment
py -3.12 -m venv venv

# 3. Activate the virtual environment
.\venv\Scripts\Activate.ps1    # On Windows PowerShell
# source venv/bin/activate     # On Linux / macOS

# 4. Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 5. Configure environment variables
# Copy .env.example to .env (Default settings use SQLite out of the box)
Copy-Item .env.example .env

# 6. Apply database migrations
python manage.py migrate

# 7. Seed demo data (Creates bases, equipment, users, inventory & transactions)
python manage.py seed_data

# 8. Start Django development server
python manage.py runserver 8000
```
Backend API will be accessible at `http://localhost:8000/`.

---

### 2. Database Setup & Seeding
By default, the backend uses `dj-database-url` and automatically connects to SQLite (`db.sqlite3`) for instant zero-configuration local runs.

To use **PostgreSQL locally**:
1. Create a database: `CREATE DATABASE military_asset_db;`
2. Update `backend/.env`:
   ```env
   DATABASE_URL=postgres://postgres:your_password@localhost:5432/military_asset_db
   ```
3. Run `python manage.py migrate && python manage.py seed_data`.

To restore from the included PostgreSQL dump:
```bash
psql -U postgres -d military_asset_db -f database/database_dump.sql
```

---

### 3. Frontend Setup
```powershell
# 1. In a new terminal, enter the frontend directory
cd frontend

# 2. Install npm dependencies
npm install

# 3. Configure environment
Copy-Item .env.example .env

# 4. Start Vite development server
npm run dev
```
Frontend application will be accessible at `http://localhost:5173/`.

---

## Demo Login Credentials

> [!IMPORTANT]
> The credentials below are provided for immediate demonstration and assessment testing:

| Role | Email | Password | Assigned Base Scope | Access Description |
|---|---|---|---|---|
| **ADMIN** | `admin@example.com` | `Admin@12345` | Global (All Bases) | Full system clearance: Base management, user provisioning, equipment catalog, all transactions, audit trails. |
| **BASE COMMANDER** | `commander@example.com` | `Commander@12345` | **Alpha Base** | Scoped exclusively to Alpha Base: View and execute requisitions, transfers, assignments, and expenditures for Alpha Base. Restricted from other bases and user administration. |
| **LOGISTICS OFFICER**| `logistics@example.com` | `Logistics@12345` | Global Logistics | Supply chain officer: Can execute purchases, inter-base transfers, view inventory across all bases. Restricted from user administration. |

*Quick-Fill Buttons*: On the `/login` screen, click any of the role chips to automatically populate these credentials.

---

## Running Automated Tests
The backend test suite validates authentication, role-based clearance, atomic inventory updates, and mathematical accounting formulas:

```powershell
cd backend
.\venv\Scripts\python.exe manage.py test apps.accounts
```
Expected output:
```
Ran 8 tests in ~1.5s
OK
```

---

## Interactive API Documentation
Interactive OpenAPI (Swagger UI) and ReDoc documentation are embedded directly in the backend:
- **Swagger UI**: `http://localhost:8000/api/docs/`
- **ReDoc**: `http://localhost:8000/api/redoc/`
- **Raw OpenAPI Schema**: `http://localhost:8000/api/schema/`

---

## Role-Based Access Control (RBAC)

RBAC is enforced on the **backend DRF layer** using custom permission classes:
1. `IsAdmin`: Allows access only if `user.role == 'ADMIN' or is_superuser`.
2. `IsBaseCommander`: Allows access only if `user.role == 'BASE_COMMANDER'`.
3. `IsLogisticsOfficer`: Allows access only if `user.role == 'LOGISTICS_OFFICER'`.
4. `IsAdminOrReadOnly`: Allows write operations only to Admins.
5. `CanAccessBase`: Ensures Base Commanders can never manipulate data belonging to other command stations.

---

## Deployment Guide

### Backend (Render Deployment)
1. Fork or push this repository to GitHub.
2. In Render, select **New Blueprint Instance** and connect your repository.
3. Render reads `render.yaml` automatically to deploy:
   - Managed PostgreSQL database (`military-asset-db`)
   - Web service (`military-asset-management-backend`) with Gunicorn
4. Once deployed, set `CORS_ALLOWED_ORIGINS` to your Vercel frontend URL.

### Frontend (Vercel Deployment)
1. Connect your repository to Vercel.
2. Set Root Directory to `frontend`.
3. Framework Preset: **Vite**.
4. Configure Environment Variable:
   - `VITE_API_URL`: `https://YOUR-BACKEND.onrender.com/api`
5. Deploy. `vercel.json` ensures all SPA client-side routes redirect cleanly to `index.html`.

---

## Troubleshooting
- **CORS Error**: Ensure `CORS_ALLOWED_ORIGINS` in `backend/.env` includes your frontend origin. In debug mode, CORS allows all origins.
- **PowerShell Script Policy Warning**: When running npm or venv scripts in PowerShell, if blocked by policy, run:
  `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
- **Port Conflict**: If port 8000 is occupied, launch Django on another port:
  `python manage.py runserver 8080` and adjust `frontend/vite.config.js`.
