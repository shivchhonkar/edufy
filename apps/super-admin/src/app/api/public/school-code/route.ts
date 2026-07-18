import { NextRequest, NextResponse } from 'next/server';
import {
  getOrganizationBranding,
  resolveSchoolCodeLookup,
} from '@edulakhya/tenant';

/** Public school-code lookup for unified mobile / platform login. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim() ?? '';
  if (!code || code.length < 2) {
    return NextResponse.json(
      { success: false, error: 'School code is required (minimum 2 characters).' },
      { status: 400 },
    );
  }

  const lookup = await resolveSchoolCodeLookup(code);
  if (!lookup) {
    return NextResponse.json(
      { success: false, error: 'No school found for this code. Please check and try again.' },
      { status: 404 },
    );
  }

  const org = lookup.organization;
  const branding = lookup.branding ?? (org ? await getOrganizationBranding(org.id) : null);

  return NextResponse.json({
    success: true,
    data: {
      school_code: lookup.school_code,
      manages_multiple_schools: lookup.manages_multiple_schools,
      organization: org
        ? {
            id: org.id,
            name: org.name,
            slug: org.slug,
            type: org.type,
          }
        : null,
      branding: branding
        ? {
            primary_color: branding.primary_color,
            secondary_color: branding.secondary_color,
            logo_url: branding.logo_url,
            tagline: branding.tagline,
          }
        : null,
      schools: lookup.schools.map((school) => ({
        id: school.id,
        name: school.name,
        slug: school.slug,
        city: school.city ?? null,
        is_primary: school.is_primary ?? false,
      })),
    },
  });
}
