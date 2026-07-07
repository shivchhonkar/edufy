import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationAuth } from '@/lib/request-db';
import { getOrganizationMetrics } from '@/lib/org-analytics';

export async function GET(request: NextRequest) {
  const auth = await requireOrganizationAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const refresh = request.nextUrl.searchParams.get('refresh') === '1';
    const metrics = await getOrganizationMetrics(auth.organizationId, {
      skipCache: refresh,
    });
    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Org dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load organization metrics' },
      { status: 500 },
    );
  }
}
