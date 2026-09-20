import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureAlumniSchema } from '@/lib/ensure-alumni-schema';
import {
  listAlumniDirectory,
  listAlumniForSelect,
  syncAlumniProfiles,
} from '@/lib/alumni-service';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureAlumniSchema(db);

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'select') {
      const search = searchParams.get('search')?.trim() || '';
      const items = await listAlumniForSelect(db, search || undefined);
      return NextResponse.json({ success: true, data: items });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search')?.trim() || '';
    const batchYear = searchParams.get('batch_year')?.trim() || '';

    const { items, total, highest_class } = await listAlumniDirectory(db, {
      page,
      limit,
      search: search || undefined,
      batchYear: batchYear || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        highest_class,
        eligibility: {
          exit_reason: 'Passed Final Class',
          highest_class_only: true,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching alumni:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch alumni' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureAlumniSchema(db);

    const body = await request.json();
    if (body.action === 'sync') {
      const synced = await syncAlumniProfiles(db);
      return NextResponse.json({ success: true, data: { synced } });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error syncing alumni:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync alumni' }, { status: 500 });
  }
}
