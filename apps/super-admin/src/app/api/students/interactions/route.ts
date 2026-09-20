import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import {
  actorName,
  isInteractionType,
  loadStudentWithClass,
  parseOptionalNumber,
  studentSnapshot,
} from '@/lib/student-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);

    const type = request.nextUrl.searchParams.get('type') || '';
    const status = request.nextUrl.searchParams.get('status') || '';
    const search = request.nextUrl.searchParams.get('search')?.trim() || '';
    const fromDate = request.nextUrl.searchParams.get('from_date') || '';
    const toDate = request.nextUrl.searchParams.get('to_date') || '';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (type && isInteractionType(type)) {
      conditions.push(`i.interaction_type = $${i}`);
      params.push(type);
      i += 1;
    }
    if (status) {
      conditions.push(`i.status = $${i}`);
      params.push(status);
      i += 1;
    }
    if (fromDate) {
      conditions.push(`i.interaction_date >= $${i}::date`);
      params.push(fromDate);
      i += 1;
    }
    if (toDate) {
      conditions.push(`i.interaction_date <= $${i}::date`);
      params.push(toDate);
      i += 1;
    }
    if (search) {
      conditions.push(`(
        i.subject ILIKE $${i}
        OR i.student_name ILIKE $${i}
        OR i.description ILIKE $${i}
      )`);
      params.push(`%${search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await auth.db.query(
      `SELECT i.* FROM student_interactions i ${where} ORDER BY i.interaction_date DESC, i.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing interactions:', error);
    return NextResponse.json({ success: false, error: 'Failed to load interactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);
    const body = await request.json();

    if (!isInteractionType(String(body.interaction_type || ''))) {
      return NextResponse.json({ success: false, error: 'Invalid interaction type' }, { status: 400 });
    }
    if (!body.subject?.trim()) {
      return NextResponse.json({ success: false, error: 'Subject is required' }, { status: 400 });
    }

    const studentId = parseOptionalNumber(body.student_id);
    let studentName = body.student_name?.trim() || null;
    if (studentId) {
      const student = await loadStudentWithClass(auth.db, studentId);
      if (student) studentName = studentSnapshot(student).full_name;
    }

    const result = await auth.db.query(
      `INSERT INTO student_interactions (
        interaction_type, student_id, student_name, interaction_date, subject,
        description, follow_up_date, status, academic_year, created_by, created_by_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        body.interaction_type,
        studentId,
        studentName,
        body.interaction_date || new Date().toISOString().split('T')[0],
        body.subject.trim(),
        body.description?.trim() || null,
        body.follow_up_date || null,
        body.status === 'closed' ? 'closed' : 'open',
        body.academic_year || null,
        auth.user.id,
        actorName(auth.user),
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating interaction:', error);
    return NextResponse.json({ success: false, error: 'Failed to save interaction' }, { status: 500 });
  }
}
