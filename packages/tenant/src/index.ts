import { Pool, QueryResult, QueryResultRow } from 'pg';
import type {
  Tenant,
  TenantBranding,
  TenantContext,
  Organization,
  OrganizationBranding,
  OrganizationContext,
} from '@edulakhya/types';

const controlPool = new Pool({
  host: process.env.CONTROL_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.CONTROL_DB_PORT || process.env.DB_PORT || '5432', 10),
  database: process.env.CONTROL_DB_NAME || 'Shribi Edufy_control',
  user: process.env.CONTROL_DB_USER || process.env.DB_USER || 'postgres',
  password: String(
    process.env.CONTROL_DB_PASSWORD ??
      process.env.DB_PASSWORD ??
      (process.env.CONTROL_DATABASE_URL || process.env.DATABASE_URL
        ? (() => {
            try {
              const url = new URL(
                process.env.CONTROL_DATABASE_URL || process.env.DATABASE_URL || '',
              );
              return url.password ? decodeURIComponent(url.password) : '';
            } catch {
              return '';
            }
          })()
        : ''),
  ),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

controlPool.on('error', (err) => {
  console.error('Control DB pool error', err);
});

export interface TenantDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

function normalizeHost(host: string): string {
  return host.replace(/^www\./, '').toLowerCase().split(':')[0];
}

function extractHostSubdomain(hostLower: string): string | null {
  const parts = hostLower.split('.');
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    return parts[0] || null;
  }
  if (parts.length >= 3) {
    return parts[0] || null;
  }
  return parts.length >= 2 ? parts[0] : null;
}

/**
 * Get connection config for a tenant's (school's) database.
 * Uses tenant's db_name; host/port/user/password from tenant overrides or env.
 * Env fallback: TENANT_DB_* or DB_* (so one server can host all school DBs with same credentials).
 */
export function getTenantDbConfig(tenant: Tenant): TenantDbConfig {
  const host =
    tenant.db_host ??
    process.env.TENANT_DB_HOST ??
    process.env.DB_HOST ??
    'localhost';
  const port =
    tenant.db_port ??
    parseInt(
      process.env.TENANT_DB_PORT ?? process.env.DB_PORT ?? '5432',
      10
    );
  const database = tenant.db_name;
  const user =
    tenant.db_user ??
    process.env.TENANT_DB_USER ??
    process.env.DB_USER ??
    '';
  let password =
    process.env.TENANT_DB_PASSWORD ??
    process.env.DB_PASSWORD ??
    '';
  if (tenant.db_password_encrypted && process.env.TENANT_DB_ENCRYPTION_KEY) {
    const decrypted = decryptTenantPassword(tenant.db_password_encrypted);
    if (decrypted) password = decrypted;
  }
  return { host, port, database, user, password };
}

function decryptTenantPassword(encrypted: string): string | null {
  try {
    const crypto = require('crypto');
    const [ivHex, encryptedHex] = encrypted.split(':');
    if (!ivHex || !encryptedHex) return null;
    const key = Buffer.from(process.env.TENANT_DB_ENCRYPTION_KEY!, 'hex').subarray(0, 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    return decipher.update(encryptedHex, 'hex', 'utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
}

async function controlQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return controlPool.query<T>(text, params);
}

// =============================================================================
// Organization (school group) resolution
// =============================================================================

/**
 * Resolve organization from request host (org portal subdomain or custom domain).
 * Does not match school (tenant) subdomains — those use getTenantByHost.
 */
export async function getOrganizationByHost(host: string): Promise<Organization | null> {
  const hostLower = normalizeHost(host);
  const subdomain = extractHostSubdomain(hostLower);

  if (subdomain) {
    const bySubdomain = await controlQuery<Organization>(
      `SELECT o.* FROM organizations o
       INNER JOIN organization_branding b ON b.organization_id = o.id
       WHERE o.is_active = true
         AND b.subdomain IS NOT NULL
         AND LOWER(b.subdomain) = $1`,
      [subdomain],
    );
    if (bySubdomain.rows.length > 0) return bySubdomain.rows[0];
  }

  const byCustomDomain = await controlQuery<Organization>(
    `SELECT o.* FROM organizations o
     INNER JOIN organization_branding b ON b.organization_id = o.id
     WHERE o.is_active = true AND LOWER(b.custom_domain) = $1`,
    [hostLower],
  );
  if (byCustomDomain.rows.length > 0) return byCustomDomain.rows[0];

  return null;
}

export async function getOrganizationById(id: number): Promise<Organization | null> {
  const result = await controlQuery<Organization>(
    'SELECT * FROM organizations WHERE id = $1 AND is_active = true',
    [id],
  );
  return result.rows[0] ?? null;
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const result = await controlQuery<Organization>(
    'SELECT * FROM organizations WHERE slug = $1 AND is_active = true',
    [slug],
  );
  return result.rows[0] ?? null;
}

export async function getOrganizationBranding(
  organizationId: number,
): Promise<OrganizationBranding | null> {
  const result = await controlQuery<OrganizationBranding>(
    'SELECT * FROM organization_branding WHERE organization_id = $1',
    [organizationId],
  );
  return result.rows[0] ?? null;
}

export async function getOrganizationContext(
  host: string,
  organizationId?: number,
): Promise<OrganizationContext | null> {
  let organization: Organization | null = null;
  if (host) organization = await getOrganizationByHost(host);
  if (!organization && organizationId) {
    organization = await getOrganizationById(organizationId);
  }
  if (!organization) return null;
  const branding = await getOrganizationBranding(organization.id);
  return { organization, branding };
}

/**
 * All active schools (tenants) belonging to an organization.
 */
export async function getSchoolsForOrganization(organizationId: number): Promise<Tenant[]> {
  const result = await controlQuery<Tenant>(
    `SELECT * FROM tenants
     WHERE organization_id = $1 AND is_active = true
     ORDER BY is_primary DESC, name ASC`,
    [organizationId],
  );
  return result.rows;
}

export async function listOrganizations(): Promise<Organization[]> {
  const result = await controlQuery<Organization>(
    'SELECT * FROM organizations WHERE is_active = true ORDER BY name',
  );
  return result.rows;
}

// =============================================================================
// School (tenant) resolution — unchanged behavior for school subdomains
// =============================================================================

/**
 * Resolve tenant from request host.
 * - subdomain: schoola.edulakhya.com → subdomain 'schoola'
 * - custom domain: schoola.com → custom_domain match
 */
export async function getTenantByHost(host: string): Promise<Tenant | null> {
  const hostLower = normalizeHost(host);
  const subdomain = extractHostSubdomain(hostLower);

  const bySubdomain = subdomain
    ? await controlQuery<Tenant>(
        `SELECT t.* FROM tenants t
         INNER JOIN tenant_branding b ON b.tenant_id = t.id
         WHERE t.is_active = true AND LOWER(b.subdomain) = $1`,
        [subdomain]
      )
    : { rows: [] };
  if (bySubdomain.rows.length > 0) return bySubdomain.rows[0];

  const byCustomDomain = await controlQuery<Tenant>(
    `SELECT t.* FROM tenants t
     INNER JOIN tenant_branding b ON b.tenant_id = t.id
     WHERE t.is_active = true AND LOWER(b.custom_domain) = $1`,
    [hostLower]
  );
  if (byCustomDomain.rows.length > 0) return byCustomDomain.rows[0];

  return null;
}

export async function getTenantById(id: number): Promise<Tenant | null> {
  const result = await controlQuery<Tenant>(
    'SELECT * FROM tenants WHERE id = $1 AND is_active = true',
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const result = await controlQuery<Tenant>(
    'SELECT * FROM tenants WHERE slug = $1 AND is_active = true',
    [slug]
  );
  return result.rows[0] ?? null;
}

export async function getTenantBranding(
  tenantId: number
): Promise<TenantBranding | null> {
  const result = await controlQuery<TenantBranding>(
    'SELECT * FROM tenant_branding WHERE tenant_id = $1',
    [tenantId]
  );
  return result.rows[0] ?? null;
}

/**
 * Full tenant context (tenant + branding) for a request.
 * Resolve from host first; if not found and tenantId provided (e.g. from JWT), resolve by id.
 */
export async function getTenantContext(
  host: string,
  tenantId?: number
): Promise<TenantContext | null> {
  let tenant: Tenant | null = null;
  if (host) tenant = await getTenantByHost(host);
  if (!tenant && tenantId) tenant = await getTenantById(tenantId);
  if (!tenant) return null;
  const branding = await getTenantBranding(tenant.id);
  return { tenant, branding };
}

/**
 * List all active tenants (schools) for platform admin / onboarding.
 */
export async function listTenants(): Promise<Tenant[]> {
  const result = await controlQuery<Tenant>(
    'SELECT * FROM tenants WHERE is_active = true ORDER BY name'
  );
  return result.rows;
}

/**
 * Resolve tenant + branding + DB config from a request (e.g. Next.js API route).
 * Uses host (subdomain or custom domain) and optionally tenant_id from cookie/header/JWT.
 * Returns null if tenant not found (e.g. unknown subdomain).
 */
export async function getTenantFromRequest(
  host: string | null,
  tenantIdFromAuth?: number
): Promise<{
  context: TenantContext;
  dbConfig: TenantDbConfig;
} | null> {
  const context = await getTenantContext(host ?? '', tenantIdFromAuth);
  if (!context) return null;
  const dbConfig = getTenantDbConfig(context.tenant);
  return { context, dbConfig };
}

export { controlPool };
export type {
  Tenant,
  TenantBranding,
  TenantContext,
  Organization,
  OrganizationBranding,
  OrganizationContext,
};
