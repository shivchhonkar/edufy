import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationAuth } from '@/lib/request-db';
import { getSchoolsForOrganization } from '@edulakhya/tenant';

export async function GET(request: NextRequest) {
  const auth = await requireOrganizationAuth(request);
  if (auth instanceof NextResponse) return auth;

  const schools = await getSchoolsForOrganization(auth.organizationId);
  return NextResponse.json({ success: true, data: schools });
}

export async function POST(request: NextRequest) {
  const auth = await requireOrganizationAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!['org_owner', 'org_admin', 'super_admin'].includes(String(auth.user.role))) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const slug = String(body.slug || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    const city = body.city ? String(body.city).trim() : null;

    if (!name || slug.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Name and slug (min 3 chars) required' },
        { status: 400 },
      );
    }

    const { registerSchoolUnderOrganization } = await import('@/lib/platform-school-service');
    const result = await registerSchoolUnderOrganization(auth.organizationId, {
      school_name: name,
      slug,
      admin_name: String(body.admin_name || auth.user.full_name || 'Admin'),
      admin_email: String(body.admin_email || auth.user.email),
      admin_password: String(body.admin_password || 'ChangeMe123!'),
      admin_phone: body.admin_phone,
      city: city || undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Add org school error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add school' },
      { status: 500 },
    );
  }
}
