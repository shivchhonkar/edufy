import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import {
  actorName,
  generatePrefixedNumber,
  loadStudentWithClass,
  studentSnapshot,
} from '@/lib/student-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);

    const search = request.nextUrl.searchParams.get('search')?.trim() || '';
    const fromDate = request.nextUrl.searchParams.get('from_date') || '';
    const toDate = request.nextUrl.searchParams.get('to_date') || '';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (search) {
      conditions.push(`(
        l.pass_number ILIKE $${i}
        OR l.student_snapshot->>'full_name' ILIKE $${i}
        OR l.student_snapshot->>'admission_number' ILIKE $${i}
      )`);
      params.push(`%${search}%`);
      i += 1;
    }
    if (fromDate) {
      conditions.push(`l.late_date >= $${i}::date`);
      params.push(fromDate);
      i += 1;
    }
    if (toDate) {
      conditions.push(`l.late_date <= $${i}::date`);
      params.push(toDate);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await auth.db.query(
      `SELECT l.* FROM student_late_passes l ${where} ORDER BY l.late_date DESC, l.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing late passes:', error);
    return NextResponse.json({ success: false, error: 'Failed to load late passes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);
    const body = await request.json();
    const studentId = parseInt(String(body.student_id), 10);
    if (!studentId || !body.arrival_time || !body.reason?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Student, arrival time, and reason are required' },
        { status: 400 }
      );
    }

    const student = await loadStudentWithClass(auth.db, studentId);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const passNumber = await generatePrefixedNumber(auth.db, 'student_late_passes', 'pass_number', 'LP');
    const result = await auth.db.query(
      `INSERT INTO student_late_passes (
        pass_number, student_id, late_date, arrival_time, reason, remarks,
        student_snapshot, created_by, created_by_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
      RETURNING *`,
      [
        passNumber,
        studentId,
        body.late_date || new Date().toISOString().split('T')[0],
        body.arrival_time,
        body.reason.trim(),
        body.remarks?.trim() || null,
        JSON.stringify(studentSnapshot(student)),
        auth.user.id,
        actorName(auth.user),
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating late pass:', error);
    return NextResponse.json({ success: false, error: 'Failed to create late pass' }, { status: 500 });
  }
}
