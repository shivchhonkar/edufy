import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureAlumniSchema } from '@/lib/ensure-alumni-schema';
import {
  createHigherEducation,
  deleteHigherEducation,
  listHigherEducation,
  updateHigherEducation,
} from '@/lib/alumni-service';

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
    const studentIdRaw = searchParams.get('student_id');
    const studentId = studentIdRaw ? parseInt(studentIdRaw, 10) : undefined;

    const { items, total } = await listHigherEducation(db, {
      page,
      limit,
      search: search || undefined,
      studentId: studentId && !Number.isNaN(studentId) ? studentId : undefined,
    });

    return NextResponse.json({ success: true, data: { items, total, page, limit } });
  } catch (error) {
    console.error('Error fetching higher education:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;
    await ensureAlumniSchema(db);

    const body = await request.json();
    const studentId = parseInt(String(body.student_id), 10);
    if (!studentId || !body.institution_name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Student and institution are required' },
        { status: 400 }
      );
    }

    const record = await createHigherEducation(db, {
      alumni_id: 0,
      student_id: studentId,
      institution_name: body.institution_name.trim(),
      degree: body.degree || null,
      field_of_study: body.field_of_study || null,
      start_year: body.start_year ? parseInt(String(body.start_year), 10) : null,
      end_year: body.end_year ? parseInt(String(body.end_year), 10) : null,
      status: body.status || 'studying',
      country: body.country || null,
      city: body.city || null,
      remarks: body.remarks || null,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create record';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
