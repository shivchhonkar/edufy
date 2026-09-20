import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureAlumniSchema } from '@/lib/ensure-alumni-schema';
import { createSuccessStory, listSuccessStories } from '@/lib/alumni-service';

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
    const publishedOnly = searchParams.get('published') === 'true';

    const { items, total } = await listSuccessStories(db, {
      page,
      limit,
      search: search || undefined,
      publishedOnly,
    });

    return NextResponse.json({ success: true, data: { items, total, page, limit } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch stories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db, user } = authResult;
    await ensureAlumniSchema(db);

    const body = await request.json();
    const studentId = parseInt(String(body.student_id), 10);
    if (!studentId || !body.title?.trim() || !body.story?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Student, title, and story are required' },
        { status: 400 }
      );
    }

    const issuerName =
      (user as { full_name?: string }).full_name || user.email || `User #${user.id}`;

    const story = await createSuccessStory(
      db,
      {
        alumni_id: 0,
        student_id: studentId,
        title: body.title.trim(),
        story: body.story.trim(),
        achievement_summary: body.achievement_summary || null,
        photo_url: body.photo_url || null,
        is_published: Boolean(body.is_published),
        created_by: user.id,
        created_by_name: issuerName,
      },
      { id: user.id, name: issuerName }
    );

    return NextResponse.json({ success: true, data: story });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create story';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
