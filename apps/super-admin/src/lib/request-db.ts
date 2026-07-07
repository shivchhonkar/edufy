import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@edulakhya/tenant';
import { getUserFromToken } from '@edulakhya/auth';
import {
  queryForTenant,
  getClientForTenant,
  transactionForTenant,
} from '@edulakhya/database';
import { query, getClient, transaction } from '@/lib/db';
import { requireAuth, getTokenFromRequest, type AuthUser } from '@/lib/api-auth';
import type { TenantContext } from '@edulakhya/types';
import type { QueryResult, QueryResultRow } from 'pg';
import { extractSubdomain } from '@/lib/tenant-host';
import { resolveHostContext, resolveSchoolFromAuth } from '@/lib/host-context';

export { extractSubdomain } from '@/lib/tenant-host';
export interface RequestDb {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ) => Promise<QueryResult<T>>;
  getClient: () => Promise<import('pg').PoolClient>;
  transaction: <T>(callback: (client: import('pg').PoolClient) => Promise<T>) => Promise<T>;
}

export interface RequestDbResult {
  db: RequestDb;
  context: TenantContext | null;
  organizationId?: number | null;
  isOrganizationHost?: boolean;
}

export class TenantResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantResolutionError';
  }
}

function buildTenantDb(resolved: NonNullable<Awaited<ReturnType<typeof getTenantFromRequest>>>) {
  const { dbConfig } = resolved;
  return {
    context: resolved.context,
    db: {
      query: <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) =>
        queryForTenant<T>(dbConfig, text, params),
      getClient: () => getClientForTenant(dbConfig),
      transaction: <T>(fn: (client: import('pg').PoolClient) => Promise<T>) =>
        transactionForTenant(dbConfig, fn),
    },
  };
}

/** Read active school/org from JWT cookie or Authorization header. */
function resolveAuthFromRequest(request: NextRequest): {
  schoolId?: number;
  organizationId?: number;
} {
  const token = getTokenFromRequest(request);
  if (!token) return {};

  const user = getUserFromToken(token);
  if (!user) return {};

  const schoolId = user.tenant_id ?? user.school_id;
  return {
    schoolId: schoolId != null ? Number(schoolId) : undefined,
    organizationId:
      user.organization_id != null ? Number(user.organization_id) : undefined,
  };
}

/**
 * Get DB for the current request.
 * - School host → school DB from subdomain
 * - Org host + JWT school_id → school DB from JWT
 * - Org host without JWT school → no school DB (control-only routes)
 * - Plain localhost → default env DB
 */
export async function getRequestDb(
  request: NextRequest,
  tenantIdFromAuth?: number,
  organizationIdFromAuth?: number,
): Promise<RequestDbResult> {
  const authFromRequest = resolveAuthFromRequest(request);
  const schoolId =
    tenantIdFromAuth ?? authFromRequest.schoolId;
  const orgId =
    organizationIdFromAuth ?? authFromRequest.organizationId;

  const host = request.headers.get('host') ?? null;
  const subdomain = extractSubdomain(host);
  const hostCtx = await resolveHostContext(host);

  if (hostCtx.tenantContext) {
    const resolved = await getTenantFromRequest(host, schoolId);
    if (!resolved) {
      throw new TenantResolutionError(
        `School "${subdomain}" not found. Please check the URL or contact support.`,
      );
    }
    if (schoolId != null && resolved.context.tenant.id !== schoolId) {
      throw new TenantResolutionError(
        'Tenant mismatch: your session does not belong to this school.',
      );
    }
    return {
      ...buildTenantDb(resolved),
      organizationId: resolved.context.tenant.organization_id,
      isOrganizationHost: false,
    };
  }

  if (hostCtx.isOrganizationHost) {
    if (schoolId != null) {
      const schoolCtx = await resolveSchoolFromAuth(schoolId, orgId);
      if (!schoolCtx) {
        throw new TenantResolutionError('School not found or not in your organization.');
      }
      if (
        orgId != null &&
        schoolCtx.tenant.organization_id !== orgId
      ) {
        throw new TenantResolutionError('School does not belong to your organization.');
      }
      const resolved = await getTenantFromRequest(null, schoolId);
      if (!resolved) {
        throw new TenantResolutionError('Failed to connect to school database.');
      }
      return {
        ...buildTenantDb(resolved),
        organizationId: hostCtx.organizationContext?.organization.id ?? schoolCtx.tenant.organization_id,
        isOrganizationHost: true,
      };
    }

    const token = getTokenFromRequest(request);
    if (token) {
      throw new TenantResolutionError(
        'No active school in session. Please select a school to continue.',
      );
    }

    return {
      context: null,
      db: {
        query: query as RequestDb['query'],
        getClient,
        transaction,
      },
      organizationId: hostCtx.organizationContext?.organization.id ?? null,
      isOrganizationHost: true,
    };
  }

  if (subdomain && !hostCtx.tenantContext) {
    throw new TenantResolutionError(
      `School "${subdomain}" not found. Please check the URL or contact support.`,
    );
  }

  if (schoolId != null) {
    const resolved = await getTenantFromRequest(null, schoolId);
    if (resolved) {
      if (
        orgId != null &&
        resolved.context.tenant.organization_id !== orgId
      ) {
        throw new TenantResolutionError('School does not belong to your organization.');
      }
      return {
        ...buildTenantDb(resolved),
        organizationId: resolved.context.tenant.organization_id,
        isOrganizationHost: false,
      };
    }
  }

  return {
    context: null,
    db: {
      query: query as RequestDb['query'],
      getClient,
      transaction,
    },
    organizationId: null,
    isOrganizationHost: false,
  };
}

export async function getRequestDbOrError(
  request: NextRequest,
): Promise<RequestDbResult | NextResponse> {
  try {
    return await getRequestDb(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tenant resolution failed';
    const status = message.includes('not found') ? 404 : 403;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/** Authenticated request DB with tenant validation */
export async function getAuthenticatedDb(
  request: NextRequest
): Promise<{ user: AuthUser; db: RequestDb; context: TenantContext | null } | NextResponse> {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const schoolId = auth.user.tenant_id ?? auth.user.school_id;
  const orgId = auth.user.organization_id;

  try {
    const { db, context } = await getRequestDb(request, schoolId, orgId);
    return { user: auth.user, db, context };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tenant resolution failed';
    const status = message.includes('not found') ? 404 : 403;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/** Org-only routes — no school DB required */
export async function requireOrganizationAuth(
  request: NextRequest,
): Promise<{ user: AuthUser; organizationId: number } | NextResponse> {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!auth.user.organization_id) {
    return NextResponse.json(
      { success: false, error: 'Organization access required' },
      { status: 403 },
    );
  }

  return { user: auth.user, organizationId: auth.user.organization_id };
}
