import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import { actorName, parseOptionalNumber } from '@/lib/student-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);

    const search = request.nextUrl.searchParams.get('search')?.trim() || '';
    const studentId = request.nextUrl.searchParams.get('student_id');
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (studentId) {
      conditions.push(`a.student_id = $${i}`);
      params.push(parseInt(studentId, 10));
      i += 1;
    }
    if (search) {
      conditions.push(`(a.title ILIKE $${i} OR s.first_name ILIKE $${i} OR s.last_name ILIKE $${i})`);
      params.push(`%${search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await auth.db.query(
      `SELECT a.*, s.first_name, s.last_name, s.admission_number, c.name AS class_name
       FROM student_activities a
       JOIN students s ON s.id = a.student_id
       LEFT JOIN classes c ON s.class_id = c.id
       ${where}
       ORDER BY a.activity_date DESC, a.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing activities:', error);
    return NextResponse.json({ success: false, error: 'Failed to load activities' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);
    const body = await request.json();
    const studentId = parseOptionalNumber(body.student_id);
    if (!studentId || !body.title?.trim()) {
      return NextResponse.json({ success: false, error: 'Student and title are required' }, { status: 400 });
    }

    const result = await auth.db.query(
      `INSERT INTO student_activities (
        student_id, academic_year, activity_date, title, category, award, remarks,
        created_by, created_by_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        studentId,
        body.academic_year || null,
        body.activity_date || new Date().toISOString().split('T')[0],
        body.title.trim(),
        body.category?.trim() || null,
        body.award?.trim() || null,
        body.remarks?.trim() || null,
        auth.user.id,
        actorName(auth.user),
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ success: false, error: 'Failed to save activity' }, { status: 500 });
  }
}
