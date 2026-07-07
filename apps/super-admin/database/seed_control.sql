-- Seed control DB with one sample organization + school (run after control_schema.sql)

INSERT INTO organizations (slug, name, type, is_active)
VALUES ('demo', 'Demo School Group', 'single', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tenants (organization_id, slug, name, db_name, is_active, is_primary)
SELECT o.id, 'demo', 'Demo School', 'edulakhya', true, true
FROM organizations o
WHERE o.slug = 'demo'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tenant_branding (tenant_id, subdomain, primary_color, secondary_color)
SELECT t.id, 'demo', '#2563eb', '#1e40af'
FROM tenants t
WHERE t.slug = 'demo'
ON CONFLICT (tenant_id) DO NOTHING;
