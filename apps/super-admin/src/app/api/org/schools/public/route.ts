import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationByHost, getSchoolsForOrganization } from '@edulakhya/tenant';

/** Public school list for organization login (resolved from host only). */
export async function GET(request: NextRequest) {
  const host = request.headers.get('host');
  const organization = host ? await getOrganizationByHost(host) : null;

  if (!organization) {
    return NextResponse.json({ success: true, data: null });
  }

  const schools = await getSchoolsForOrganization(organization.id);

  return NextResponse.json({
    success: true,
    data: {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
      },
      schools: schools.map((school) => ({
        id: school.id,
        name: school.name,
        slug: school.slug,
        city: school.city ?? null,
        is_primary: school.is_primary ?? false,
      })),
    },
  });
}
