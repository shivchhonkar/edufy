import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@edulakhya/tenant';
import { resolveHostContext } from '@/lib/host-context';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host');
  const hostCtx = await resolveHostContext(host);

  if (hostCtx.organizationContext) {
    const { organization, branding } = hostCtx.organizationContext;
    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          type: organization.type,
        },
        branding: branding
          ? {
              primary_color: branding.primary_color,
              secondary_color: branding.secondary_color,
              logo_url: branding.logo_url,
              tagline: branding.tagline,
              subdomain: branding.subdomain,
            }
          : null,
      },
    });
  }

  const ctx = host ? await getOrganizationContext(host) : null;
  if (!ctx) {
    return NextResponse.json({ success: true, data: null });
  }

  return NextResponse.json({
    success: true,
    data: {
      organization: {
        id: ctx.organization.id,
        name: ctx.organization.name,
        slug: ctx.organization.slug,
        type: ctx.organization.type,
      },
      branding: ctx.branding,
    },
  });
}
