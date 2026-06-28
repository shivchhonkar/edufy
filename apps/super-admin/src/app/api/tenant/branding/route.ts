import { NextRequest, NextResponse } from 'next/server';
import { ensureSystemSettings } from '@/lib/ensure-system-settings';
import { getRequestDb, TenantResolutionError } from '@/lib/request-db';
import { extractSubdomain } from '@/lib/tenant-host';
import { mergeReportSettings } from '@/lib/report-settings';

function parseReportSettings(raw: unknown) {
  if (!raw) return mergeReportSettings(undefined);
  if (typeof raw === 'string') {
    try {
      return mergeReportSettings(JSON.parse(raw));
    } catch {
      return mergeReportSettings(undefined);
    }
  }
  return mergeReportSettings(raw);
}

/** Public branding payload for tenant login pages (subdomain schools only). */
export async function GET(request: NextRequest) {
  const host = request.headers.get('host');
  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    return NextResponse.json({ success: true, data: null });
  }

  try {
    const { db, context } = await getRequestDb(request);
    if (!context) {
      return NextResponse.json({ success: false, error: 'School not found' }, { status: 404 });
    }

    await ensureSystemSettings(db);
    const settingsResult = await db.query<{
      school_name: string | null;
      school_address: string | null;
      school_phone: string | null;
      school_email: string | null;
      report_settings: unknown;
    }>(`SELECT school_name, school_address, school_phone, school_email, report_settings
        FROM system_settings ORDER BY id DESC LIMIT 1`);

    const row = settingsResult.rows[0];
    const reportSettings = parseReportSettings(row?.report_settings);
    const branding = context.branding;

    const logoUrl =
      reportSettings.logo_url?.trim() ||
      branding?.logo_url?.trim() ||
      null;

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: context.tenant.id,
          name: context.tenant.name,
          slug: context.tenant.slug,
        },
        school: {
          name: row?.school_name?.trim() || context.tenant.name,
          address: row?.school_address?.trim() || '',
          phone: row?.school_phone?.trim() || branding?.support_phone?.trim() || '',
          email: row?.school_email?.trim() || branding?.support_email?.trim() || '',
          logo_url: logoUrl,
        },
        branding: {
          primary_color: branding?.primary_color || '#0D3D75',
          secondary_color: branding?.secondary_color || '#4DC4F0',
          tagline: branding?.tagline || null,
          subdomain: branding?.subdomain || context.tenant.slug,
          support_phone: branding?.support_phone || null,
          support_email: branding?.support_email || null,
        },
      },
    });
  } catch (error) {
    if (error instanceof TenantResolutionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    console.error('Tenant branding fetch failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load school branding' },
      { status: 500 },
    );
  }
}
