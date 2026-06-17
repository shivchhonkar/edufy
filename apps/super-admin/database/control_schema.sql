-- EduLakhya Control Database Schema
-- This is the ONLY shared database. It holds tenant registry and branding.
-- Each school's operational data lives in its own database (DB_A, DB_B, ...).

-- Tenants (Schools) registry
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    -- Database connection for this school's data (separate DB per school)
    db_name VARCHAR(100) NOT NULL,
    db_host VARCHAR(255),
    db_port INTEGER,
    db_user VARCHAR(255),
    db_password_encrypted TEXT,
    -- If null, use CONTROL env defaults for host/port; db_name is always from here.
    -- Optional: override host/port/user for school DBs on different servers.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- White-label / branding per tenant
CREATE TABLE IF NOT EXISTS tenant_branding (
    tenant_id INTEGER PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#2563eb',
    secondary_color VARCHAR(20) DEFAULT '#1e40af',
    support_email VARCHAR(255),
    support_phone VARCHAR(50),
    custom_domain VARCHAR(255) UNIQUE,
    -- Subdomain under main app domain, e.g. 'schoola' for schoola.edulakhya.com
    subdomain VARCHAR(50) UNIQUE NOT NULL,
    tagline VARCHAR(255),
    footer_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Domain → tenant mapping (subdomain or custom domain)
-- Resolve host (e.g. schoola.edulakhya.com or schoola.com) to tenant_id
CREATE INDEX IF NOT EXISTS idx_tenant_branding_subdomain ON tenant_branding(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenant_branding_custom_domain ON tenant_branding(custom_domain) WHERE custom_domain IS NOT NULL;

-- Optional: platform super-admin users (can create schools, view all tenants)
-- Stored in control DB only; school-specific users stay in each school's DB
CREATE TABLE IF NOT EXISTS platform_admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tenants IS 'One row per school. Each school has its own database (db_name).';
COMMENT ON TABLE tenant_branding IS 'White-label: logo, colors, domain. One row per tenant.';
COMMENT ON TABLE platform_admins IS 'EduLakhya platform admins; not school users.';
