import { NextRequest, NextResponse } from 'next/server';
import { getTenantByHost } from '@edulakhya/tenant';
import { extractSubdomain } from '@/lib/tenant-host';

/**
 * Public tenant lookup for middleware — verifies subdomain maps to an active school.
 * Host is passed via x-tenant-host when called from middleware (preserves original subdomain).
 */
export async function GET(request: NextRequest) {
  const host =
    request.headers.get('x-tenant-host') ??
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host');

  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return NextResponse.json({ exists: true, subdomain: null });
  }

  try {
    const tenant = await getTenantByHost(host ?? '');
    return NextResponse.json({
      exists: Boolean(tenant),
      subdomain,
    });
  } catch (error) {
    console.error('Tenant check failed:', error);
    return NextResponse.json(
      { exists: null, subdomain, error: 'Tenant lookup unavailable' },
      { status: 503 },
    );
  }
}
