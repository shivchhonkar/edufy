-- Phase 1: Organization layer (school groups) on control DB
-- Tenant row = school/campus; organization = trust / school group.
-- Safe to run multiple times (idempotent).

-- Organizations (the "tenant" in Edunext-style multi-school model)
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'single',
    -- single | trust | franchise | chain
    is_active BOOLEAN DEFAULT true,
    max_schools INTEGER,
    subscription_plan VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active) WHERE is_active = true;

-- Org-level white-label (e.g. dps.edulakhya.com — distinct from school subdomains)
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

-- Link schools (tenants) to organizations
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS state VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_tenants_organization_id ON tenants(organization_id);

-- HQ / corporate users (control DB only)
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
CREATE INDEX IF NOT EXISTS idx_organization_users_email ON organization_users(LOWER(email));

-- Which schools an org user may access (for school switcher — Phase 2 auth)
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

COMMENT ON TABLE organizations IS 'School group / trust / franchise. One org has many schools (tenants).';
COMMENT ON TABLE organization_branding IS 'Org portal branding; subdomain optional for single-school orgs.';
COMMENT ON TABLE organization_users IS 'Corporate HQ users; login at org subdomain (Phase 2).';
COMMENT ON TABLE user_school_access IS 'Org user access to specific school DBs.';
COMMENT ON COLUMN tenants.organization_id IS 'Parent organization; NULL until migrated or registered.';
