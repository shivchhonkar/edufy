import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import {
  actorName,
  CERTIFICATE_PREFIX,
  generatePrefixedNumber,
  isCertificateType,
  loadStudentWithClass,
  studentSnapshot,
} from '@/lib/student-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);

    const type = request.nextUrl.searchParams.get('type') || '';
    const search = request.nextUrl.searchParams.get('search')?.trim() || '';
    const academicYear = request.nextUrl.searchParams.get('academic_year') || '';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (type && isCertificateType(type)) {
      conditions.push(`c.certificate_type = $${i}`);
      params.push(type);
      i += 1;
    }
    if (academicYear) {
      conditions.push(`c.academic_year = $${i}`);
      params.push(academicYear);
      i += 1;
    }
    if (search) {
      conditions.push(`(
        c.certificate_number ILIKE $${i}
        OR c.student_snapshot->>'full_name' ILIKE $${i}
        OR c.student_snapshot->>'admission_number' ILIKE $${i}
      )`);
      params.push(`%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await auth.db.query(
      `SELECT c.* FROM student_issued_certificates c ${where} ORDER BY c.issue_date DESC, c.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing certificates:', error);
    return NextResponse.json({ success: false, error: 'Failed to load certificates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);
    const body = await request.json();

    if (!isCertificateType(String(body.certificate_type || ''))) {
      return NextResponse.json({ success: false, error: 'Invalid certificate type' }, { status: 400 });
    }
    const studentId = parseInt(String(body.student_id), 10);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'student_id is required' }, { status: 400 });
    }

    const student = await loadStudentWithClass(auth.db, studentId);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const certificateNumber = await generatePrefixedNumber(
      auth.db,
      'student_issued_certificates',
      'certificate_number',
      CERTIFICATE_PREFIX[body.certificate_type]
    );

    const result = await auth.db.query(
      `INSERT INTO student_issued_certificates (
        certificate_type, certificate_number, student_id, academic_year,
        issue_date, purpose, remarks, student_snapshot, school_snapshot,
        created_by, created_by_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11)
      RETURNING *`,
      [
        body.certificate_type,
        certificateNumber,
        studentId,
        body.academic_year || null,
        body.issue_date || new Date().toISOString().split('T')[0],
        body.purpose?.trim() || null,
        body.remarks?.trim() || null,
        JSON.stringify(studentSnapshot(student)),
        JSON.stringify(body.school_snapshot || {}),
        auth.user.id,
        actorName(auth.user),
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error issuing certificate:', error);
    return NextResponse.json({ success: false, error: 'Failed to issue certificate' }, { status: 500 });
  }
}
