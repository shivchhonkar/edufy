import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getServerAuthCookieOptions } from '@/lib/auth-cookie';
import { buildSchoolSwitchToken } from '@/lib/org-auth';

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const schoolId = parseInt(String(body.school_id ?? body.tenant_id ?? ''), 10);
    if (!Number.isFinite(schoolId)) {
      return NextResponse.json({ success: false, error: 'school_id is required' }, { status: 400 });
    }

    const result = await buildSchoolSwitchToken(auth.user, schoolId);
    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    const response = NextResponse.json({
      success: true,
      data: {
        token: result.token,
        school: result.school,
        user: {
          ...auth.user,
          tenant_id: result.school.id,
          tenant_slug: result.school.slug,
          school_id: result.school.id,
          school_slug: result.school.slug,
        },
      },
    });

    response.cookies.set('token', result.token, getServerAuthCookieOptions(request.headers.get('host')));

    return response;
  } catch (error) {
    console.error('Switch school error:', error);
    return NextResponse.json({ success: false, error: 'Failed to switch school' }, { status: 500 });
  }
}
