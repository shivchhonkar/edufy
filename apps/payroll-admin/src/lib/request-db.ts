import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@edulakhya/tenant';
import {
  queryForTenant,
  getClientForTenant,
  transactionForTenant,
} from '@edulakhya/database';
import { query, getClient, transaction } from '@/lib/db';
import { requireAuth, type AuthUser } from '@/lib/api-auth';
import type { TenantContext } from '@edulakhya/types';
import type { QueryResult, QueryResultRow } from 'pg';
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
}

export class TenantResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantResolutionError';
  }
}

/** Extract school subdomain from host (e.g. gla.localhost → gla) */
export function extractSubdomain(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0].toLowerCase();

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  const parts = hostname.split('.');

  // gla.localhost
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    return parts[0] || null;
  }

  // gla.edufy.example.com (subdomain present)
  if (parts.length >= 3) {
    return parts[0] || null;
  }

  return null;
}

/**
 * Get DB for the current request. Resolves tenant from host subdomain.
 * When subdomain is present but tenant not found → throws (no silent fallback).
 * Validates JWT tenant_id matches resolved tenant when both are present.
 */
export async function getRequestDb(
  request: NextRequest,
  tenantIdFromAuth?: number
): Promise<RequestDbResult> {
  const host = request.headers.get('host') ?? null;
  const subdomain = extractSubdomain(host);
  let resolved: Awaited<ReturnType<typeof getTenantFromRequest>> | null = null;

  try {
    resolved = await getTenantFromRequest(host, tenantIdFromAuth);
  } catch (error) {
    if (subdomain) {
      throw new TenantResolutionError(
        `School "${subdomain}" not found. Please check the URL or contact support.`
      );
    }
    console.error('Tenant resolution failed, falling back to default DB.', error);
    resolved = null;
  }

  if (subdomain && !resolved) {
    throw new TenantResolutionError(
      `School "${subdomain}" not found. Please check the URL or contact support.`
    );
  }

  if (resolved && tenantIdFromAuth != null && resolved.context.tenant.id !== tenantIdFromAuth) {
    throw new TenantResolutionError(
      'Tenant mismatch: your session does not belong to this school.'
    );
  }

  if (resolved) {
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

  return {
    context: null,
    db: {
      query: query as RequestDb['query'],
      getClient,
      transaction,
    },
  };
}

/** Login and simple routes — returns JSON error instead of throwing */
export async function getRequestDbOrError(
  request: NextRequest,
): Promise<RequestDbResult | NextResponse> {
  try {
    return await getRequestDb(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tenant resolution failed';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/** Authenticated request DB with tenant validation */
export async function getAuthenticatedDb(
  request: NextRequest
): Promise<{ user: AuthUser; db: RequestDb; context: TenantContext | null } | NextResponse> {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { db, context } = await getRequestDb(request, auth.user.tenant_id);
    return { user: auth.user, db, context };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tenant resolution failed';
    const status = message.includes('not found') ? 404 : 403;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
