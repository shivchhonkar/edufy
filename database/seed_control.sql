-- Seed control DB with one sample tenant (run after control_schema.sql)
-- Replace with your real school and DB name.

INSERT INTO tenants (slug, name, db_name, is_active)
VALUES ('demo', 'Demo School', 'edulakhya', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tenant_branding (tenant_id, subdomain, primary_color, secondary_color)
SELECT id, 'demo', '#2563eb', '#1e40af'
FROM tenants WHERE slug = 'demo'
ON CONFLICT (tenant_id) DO NOTHING;
