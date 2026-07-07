import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getOrgSessionPayload } from '@/lib/org-auth';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const session = await getOrgSessionPayload(auth.user);
    if (!session) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('Org session error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load session' }, { status: 500 });
  }
}
