import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureAlumniSchema } from '@/lib/ensure-alumni-schema';
import { getAlumniProfile, updateAlumniProfile } from '@/lib/alumni-service';

function parseId(raw: string): number | null {
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;
    await ensureAlumniSchema(db);

    const id = parseId(params.id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    const profile = await getAlumniProfile(db, id);
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Alumni not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching alumni profile:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch alumni' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;
    await ensureAlumniSchema(db);

    const id = parseId(params.id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    const body = await request.json();
    const profile = await updateAlumniProfile(db, id, body);
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Alumni not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error updating alumni profile:', error);
    return NextResponse.json({ success: false, error: 'Failed to update alumni' }, { status: 500 });
  }
}
