-- EduLakhya Control Database Schema
-- Shared registry: organizations (school groups), schools (tenants), branding, org users.
-- Each school's operational data lives in its own database (DB_A, DB_B, ...).

-- =============================================================================
-- Organizations (tenant = school group / trust / franchise)
-- =============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'single',
    school_code VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    max_schools INTEGER,
    subscription_plan VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(LOWER(slug));

CREATE TABLE IF NOT EXISTS organization_branding (
    organization_id INTEGER PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#2563eb',
    secondary_color VARCHAR(20) DEFAULT '#1e40af',
    support_email VARCHAR(255),
    support_phone VARCHAR(50),
    custom_domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(50) UNIQUE,
    tagline VARCHAR(255),
    footer_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organization_branding_subdomain
    ON organization_branding(LOWER(subdomain))
    WHERE subdomain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organization_branding_custom_domain
    ON organization_branding(custom_domain)
    WHERE custom_domain IS NOT NULL;

-- =============================================================================
-- Schools (tenants) — one row per campus; each has its own database
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20),
    city VARCHAR(100),
    state VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    db_name VARCHAR(100) NOT NULL,
    db_host VARCHAR(255),
    db_port INTEGER,
    db_user VARCHAR(255),
    db_password_encrypted TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_organization_id ON tenants(organization_id);

-- White-label / branding per school
CREATE TABLE IF NOT EXISTS tenant_branding (
    tenant_id INTEGER PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#2563eb',
    secondary_color VARCHAR(20) DEFAULT '#1e40af',
    support_email VARCHAR(255),
    support_phone VARCHAR(50),
    custom_domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(50) UNIQUE NOT NULL,
    tagline VARCHAR(255),
    footer_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_branding_subdomain ON tenant_branding(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenant_branding_custom_domain ON tenant_branding(custom_domain) WHERE custom_domain IS NOT NULL;

-- =============================================================================
-- Organization users & school access
-- =============================================================================
CREATE TABLE IF NOT EXISTS organization_users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'org_admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_organization_users_org ON organization_users(organization_id);

CREATE TABLE IF NOT EXISTS user_school_access (
    id SERIAL PRIMARY KEY,
    organization_user_id INTEGER NOT NULL REFERENCES organization_users(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'school_admin',
    is_default BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_school_access_user ON user_school_access(organization_user_id);
CREATE INDEX IF NOT EXISTS idx_user_school_access_tenant ON user_school_access(tenant_id);

-- =============================================================================
-- Platform admins (EduLakhya operators)
-- =============================================================================
CREATE TABLE IF NOT EXISTS platform_admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE organizations IS 'School group / trust. Tenant in product terms.';
COMMENT ON TABLE tenants IS 'School campus / branch. Each school has its own database (db_name).';
COMMENT ON TABLE tenant_branding IS 'School white-label: logo, colors, school subdomain.';
COMMENT ON TABLE organization_branding IS 'Org portal branding (HQ subdomain).';
COMMENT ON TABLE organization_users IS 'Corporate users for org-level login.';
COMMENT ON TABLE user_school_access IS 'Maps org users to schools they can switch into.';
COMMENT ON TABLE platform_admins IS 'EduLakhya platform admins; not school users.';
