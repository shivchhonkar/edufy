import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureAlumniSchema } from '@/lib/ensure-alumni-schema';
import { createAlumniEvent, listAlumniEvents } from '@/lib/alumni-service';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;
    await ensureAlumniSchema(db);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';

    const { items, total } = await listAlumniEvents(db, {
      page,
      limit,
      search: search || undefined,
      status: status || undefined,
    });

    return NextResponse.json({ success: true, data: { items, total, page, limit } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db, user } = authResult;
    await ensureAlumniSchema(db);

    const body = await request.json();
    if (!body.title?.trim() || !body.event_date) {
      return NextResponse.json(
        { success: false, error: 'Title and event date are required' },
        { status: 400 }
      );
    }

    const issuerName =
      (user as { full_name?: string }).full_name || user.email || `User #${user.id}`;

    const event = await createAlumniEvent(
      db,
      {
        title: body.title.trim(),
        description: body.description || null,
        event_date: body.event_date,
        event_time: body.event_time || null,
        venue: body.venue || null,
        event_type: body.event_type || 'reunion',
        max_attendees: body.max_attendees ? parseInt(String(body.max_attendees), 10) : null,
        registration_deadline: body.registration_deadline || null,
        status: body.status || 'scheduled',
        created_by: user.id,
        created_by_name: issuerName,
      },
      { id: user.id, name: issuerName }
    );

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 });
  }
}
