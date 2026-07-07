import { NextRequest } from 'next/server';
import {
  getOrganizationByHost,
  getOrganizationContext,
  getTenantFromRequest,
  getTenantById,
} from '@edulakhya/tenant';
import type { OrganizationContext, TenantContext } from '@edulakhya/types';
import { extractSubdomain } from '@/lib/tenant-host';

export interface HostResolution {
  /** School subdomain host (e.g. shiv.localhost) */
  isSchoolHost: boolean;
  /** Org portal host (organization_branding subdomain) */
  isOrganizationHost: boolean;
  organizationContext: OrganizationContext | null;
  tenantContext: TenantContext | null;
  subdomain: string | null;
}

/**
 * Resolve whether the host maps to a school, an organization portal, or neither.
 * School subdomains take precedence when both could match.
 */
export async function resolveHostContext(host: string | null): Promise<HostResolution> {
  const subdomain = extractSubdomain(host);
  const tenantResolved = host ? await getTenantFromRequest(host) : null;
  const tenantContext = tenantResolved?.context ?? null;

  if (tenantContext) {
    return {
      isSchoolHost: true,
      isOrganizationHost: false,
      organizationContext: null,
      tenantContext,
      subdomain,
    };
  }

  const orgContext = host ? await getOrganizationContext(host) : null;
  if (orgContext) {
    return {
      isSchoolHost: false,
      isOrganizationHost: true,
      organizationContext: orgContext,
      tenantContext: null,
      subdomain,
    };
  }

  return {
    isSchoolHost: !!subdomain,
    isOrganizationHost: false,
    organizationContext: null,
    tenantContext: null,
    subdomain,
  };
}

/** Resolve active school from JWT when on org host or when school host is absent. */
export async function resolveSchoolFromAuth(
  tenantIdFromAuth?: number,
  organizationIdFromAuth?: number,
): Promise<TenantContext | null> {
  if (!tenantIdFromAuth) return null;

  const tenant = await getTenantById(tenantIdFromAuth);
  if (!tenant) return null;

  if (organizationIdFromAuth != null && tenant.organization_id !== organizationIdFromAuth) {
    return null;
  }

  const resolved = await getTenantFromRequest(null, tenantIdFromAuth);
  return resolved?.context ?? null;
}

export function getAuthOrgId(auth?: {
  organization_id?: number;
  tenant_id?: number;
}): number | undefined {
  return auth?.organization_id;
}

export function getAuthSchoolId(auth?: {
  tenant_id?: number;
  school_id?: number;
}): number | undefined {
  return auth?.tenant_id ?? auth?.school_id;
}

export async function readHostFromRequest(request: NextRequest): Promise<string | null> {
  return request.headers.get('host');
}
