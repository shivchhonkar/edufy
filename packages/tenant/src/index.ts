import { Pool, QueryResult, QueryResultRow } from 'pg';
import type { Tenant, TenantBranding, TenantContext } from '@edulakhya/types';

const controlPool = new Pool({
  host: process.env.CONTROL_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.CONTROL_DB_PORT || process.env.DB_PORT || '5432', 10),
  database: process.env.CONTROL_DB_NAME || 'edulakhya_control',
  user: process.env.CONTROL_DB_USER || process.env.DB_USER,
  password: process.env.CONTROL_DB_PASSWORD || process.env.DB_PASSWORD,
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

/**
 * Resolve tenant from request host.
 * - subdomain: schoola.edulakhya.com → subdomain 'schoola'
 * - custom domain: schoola.com → custom_domain match
 */
export async function getTenantByHost(host: string): Promise<Tenant | null> {
  const hostLower = host.replace(/^www\./, '').toLowerCase().split(':')[0];
  const parts = hostLower.split('.');
  const subdomain = parts.length >= 2 ? parts[0] : null;

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
 * List all active tenants (for platform admin / onboarding).
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
export type { Tenant, TenantBranding, TenantContext };
