-- Organization-level school code for unified mobile / platform login (e.g. KMPI).
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS school_code VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_school_code
  ON organizations (UPPER(school_code))
  WHERE school_code IS NOT NULL AND school_code <> '';

CREATE INDEX IF NOT EXISTS idx_tenants_code_upper
  ON tenants (UPPER(code))
  WHERE code IS NOT NULL AND code <> '';
