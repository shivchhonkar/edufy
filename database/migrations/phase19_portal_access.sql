-- Parent / student portal and staff ESS access controls
ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_access_enabled BOOLEAN DEFAULT true;
ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_permissions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE staff ADD COLUMN IF NOT EXISTS portal_access_enabled BOOLEAN DEFAULT true;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS portal_permissions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS parent_portal_defaults JSONB DEFAULT '{}'::jsonb;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS staff_portal_defaults JSONB DEFAULT '{}'::jsonb;
