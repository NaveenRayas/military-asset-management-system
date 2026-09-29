-- ====================================================================
-- MILITARY ASSET MANAGEMENT SYSTEM - DATABASE SCHEMA & SEED DUMP
-- Target: PostgreSQL 14+
-- Generated for production deployment & offline restoration
-- ====================================================================

-- 1. BASE TABLE
CREATE TABLE IF NOT EXISTS bases (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    is_superuser BOOLEAN DEFAULT FALSE NOT NULL,
    username VARCHAR(150) UNIQUE,
    first_name VARCHAR(150) DEFAULT '',
    last_name VARCHAR(150) DEFAULT '',
    email VARCHAR(254) UNIQUE NOT NULL,
    is_staff BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    date_joined TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role VARCHAR(30) DEFAULT 'LOGISTICS_OFFICER' NOT NULL,
    base_id BIGINT REFERENCES bases(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. EQUIPMENT TYPES TABLE
CREATE TABLE IF NOT EXISTS equipment_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) DEFAULT 'Other' NOT NULL,
    unit VARCHAR(30) DEFAULT 'units' NOT NULL,
    description TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS inventories (
    id BIGSERIAL PRIMARY KEY,
    base_id BIGINT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
    equipment_type_id BIGINT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_base_equipment_inventory UNIQUE (base_id, equipment_type_id),
    CONSTRAINT inventory_quantity_non_negative CHECK (quantity >= 0)
);

-- 5. PURCHASES TABLE
CREATE TABLE IF NOT EXISTS purchases (
    id BIGSERIAL PRIMARY KEY,
    base_id BIGINT NOT NULL REFERENCES bases(id) ON DELETE RESTRICT,
    equipment_type_id BIGINT NOT NULL REFERENCES equipment_types(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    purchase_date DATE NOT NULL,
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
    total_cost NUMERIC(14, 2) NOT NULL,
    notes TEXT DEFAULT '',
    created_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. TRANSFERS TABLE
CREATE TABLE IF NOT EXISTS transfers (
    id BIGSERIAL PRIMARY KEY,
    from_base_id BIGINT NOT NULL REFERENCES bases(id) ON DELETE RESTRICT,
    to_base_id BIGINT NOT NULL REFERENCES bases(id) ON DELETE RESTRICT,
    equipment_type_id BIGINT NOT NULL REFERENCES equipment_types(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    transfer_date DATE NOT NULL,
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'COMPLETED' NOT NULL,
    notes TEXT DEFAULT '',
    created_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT different_source_destination_bases CHECK (from_base_id <> to_base_id)
);

-- 7. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS assignments (
    id BIGSERIAL PRIMARY KEY,
    base_id BIGINT NOT NULL REFERENCES bases(id) ON DELETE RESTRICT,
    equipment_type_id BIGINT NOT NULL REFERENCES equipment_types(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    personnel_name VARCHAR(150) NOT NULL,
    personnel_identifier VARCHAR(100) NOT NULL,
    assignment_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    notes TEXT DEFAULT '',
    assigned_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. EXPENDITURES TABLE
CREATE TABLE IF NOT EXISTS expenditures (
    id BIGSERIAL PRIMARY KEY,
    base_id BIGINT NOT NULL REFERENCES bases(id) ON DELETE RESTRICT,
    equipment_type_id BIGINT NOT NULL REFERENCES equipment_types(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    expenditure_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    notes TEXT DEFAULT '',
    recorded_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) DEFAULT '',
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ====================================================================
-- SEED DATA INSERTION
-- ====================================================================

-- Bases
INSERT INTO bases (id, name, code, location, description, is_active, created_at, updated_at)
VALUES 
(1, 'Alpha Base', 'BASE-ALPHA', 'Sector 4, Northern Frontier', 'Primary command and logistics hub for Northern Operations.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Bravo Base', 'BASE-BRAVO', 'Sector 9, Eastern Desert Ridge', 'Advanced armored reconnaissance and tactical response post.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Charlie Base', 'BASE-CHARLIE', 'Sector 12, Coastal Highland', 'Maritime defense, coastal surveillance and communications outpost.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Equipment Types
INSERT INTO equipment_types (id, name, category, unit, description, is_active, created_at, updated_at)
VALUES
(1, 'Armored Combat Vehicle M1', 'Vehicle', 'vehicles', 'Tracked heavy infantry fighting vehicle with 30mm auto-cannon.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Tactical Utility Vehicle 4x4', 'Vehicle', 'vehicles', 'All-terrain multi-role light transport and patrol vehicle.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Service Assault Rifle 5.56mm', 'Weapon', 'rifles', 'Standard issue select-fire infantry service rifle.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'Heavy Machine Gun .50 Cal', 'Weapon', 'guns', 'Belt-fed air-cooled heavy suppressive weapon.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, '5.56mm NATO Ammunition Crate (1000 rounds)', 'Ammunition', 'crates', 'High-velocity ball standard infantry ammunition.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'Tactical VHF/UHF Field Radio', 'Communication', 'units', 'Frequency-hopping encrypted secure field communication transceiver.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'Advanced Combat Ballistic Helmet', 'Protective Equipment', 'helmets', 'Level IIIA Kevlar composite protective helmet with NVG mount.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Users (Demo passwords: Admin@12345, Commander@12345, Logistics@12345 using PBKDF2 SHA256)
-- Passwords will also be set dynamically by seed_data.py
INSERT INTO users (id, password, is_superuser, username, first_name, last_name, email, is_staff, is_active, role, base_id, date_joined, created_at, updated_at)
VALUES
(1, 'pbkdf2_sha256$870000$p4vX9kL8...$demo_admin_hash', TRUE, 'admin', 'Chief Admin', 'Commander', 'admin@example.com', TRUE, TRUE, 'ADMIN', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'pbkdf2_sha256$870000$m9vX9kL8...$demo_commander_hash', FALSE, 'commander', 'Col. Marcus', 'Vance', 'commander@example.com', FALSE, TRUE, 'BASE_COMMANDER', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'pbkdf2_sha256$870000$q1vX9kL8...$demo_logistics_hash', FALSE, 'logistics', 'Major Sarah', 'Jenkins', 'logistics@example.com', FALSE, TRUE, 'LOGISTICS_OFFICER', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Inventories
INSERT INTO inventories (base_id, equipment_type_id, quantity, created_at, updated_at)
VALUES
(1, 1, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 2, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 3, 120, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 5, 160, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 6, 35, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 7, 180, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 3, 128, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 4, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 2, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 6, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 7, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (base_id, equipment_type_id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- Reset sequence counters
SELECT setval(pg_get_serial_sequence('bases', 'id'), coalesce(max(id), 1)) FROM bases;
SELECT setval(pg_get_serial_sequence('equipment_types', 'id'), coalesce(max(id), 1)) FROM equipment_types;
SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id), 1)) FROM users;
SELECT setval(pg_get_serial_sequence('inventories', 'id'), coalesce(max(id), 1)) FROM inventories;
