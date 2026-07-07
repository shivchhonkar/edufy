import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationByHost, getTenantByHost } from '@edulakhya/tenant';
import { extractSubdomain } from '@/lib/tenant-host';

/**
 * Public host lookup for middleware — verifies subdomain maps to an active school or org portal.
 * Host is passed via x-tenant-host when called from middleware (preserves original subdomain).
 */
export async function GET(request: NextRequest) {
  const host =
    request.headers.get('x-tenant-host') ??
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host');

  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return NextResponse.json({ exists: true, subdomain: null, hostType: 'platform' });
  }

  try {
    const tenant = await getTenantByHost(host ?? '');
    if (tenant) {
      return NextResponse.json({
        exists: true,
        subdomain,
        hostType: 'school',
      });
    }

    const organization = await getOrganizationByHost(host ?? '');
    if (organization) {
      return NextResponse.json({
        exists: true,
        subdomain,
        hostType: 'organization',
        organizationSlug: organization.slug,
      });
    }

    return NextResponse.json({
      exists: false,
      subdomain,
      hostType: null,
    });
  } catch (error) {
    console.error('Tenant check failed:', error);
    return NextResponse.json(
      { exists: null, subdomain, error: 'Tenant lookup unavailable' },
      { status: 503 },
    );
  }
}
