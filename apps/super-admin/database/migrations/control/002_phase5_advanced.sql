-- Phase 5: Advanced org features (admission leads, curriculum templates, subscriptions)

CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL DEFAULT 'standard',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    school_count_limit INTEGER,
    student_count_limit INTEGER,
    billing_cycle VARCHAR(20) DEFAULT 'annual',
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON organization_subscriptions(organization_id);

CREATE TABLE IF NOT EXISTS admission_leads (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    target_tenant_id INTEGER REFERENCES tenants(id),
    student_name VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255),
    parent_phone VARCHAR(30),
    parent_email VARCHAR(255),
    grade_interest VARCHAR(100),
    source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admission_leads_org ON admission_leads(organization_id);

CREATE TABLE IF NOT EXISTS curriculum_templates (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_curriculum_templates_org ON curriculum_templates(organization_id);

CREATE TABLE IF NOT EXISTS parent_school_links (
    id SERIAL PRIMARY KEY,
    parent_login_key VARCHAR(255) NOT NULL,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    organization_id INTEGER REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (parent_login_key, tenant_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_school_links_login ON parent_school_links(parent_login_key);

COMMENT ON TABLE admission_leads IS 'Centralized admission pipeline at org level (Phase 5).';
COMMENT ON TABLE curriculum_templates IS 'Org-wide curriculum pushed to schools.';
COMMENT ON TABLE parent_school_links IS 'Parent portal access across multiple schools.';
