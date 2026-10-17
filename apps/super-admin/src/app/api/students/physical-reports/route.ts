import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import { prepareEnrollmentSchema } from '@/lib/enrollment-service';
import {
  actorName,
  calculateBmi,
  loadStudentWithClass,
  parseOptionalNumber,
  studentSnapshot,
} from '@/lib/student-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);
    await prepareEnrollmentSchema(auth.db);

    const search = request.nextUrl.searchParams.get('search')?.trim() || '';
    const classId = request.nextUrl.searchParams.get('class_id');
    const studentId = request.nextUrl.searchParams.get('student_id');
    const fromDate = request.nextUrl.searchParams.get('from_date');
    const toDate = request.nextUrl.searchParams.get('to_date');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (studentId) {
      const parsedStudentId = parseInt(studentId, 10);
      if (Number.isFinite(parsedStudentId)) {
        conditions.push(`p.student_id = $${i}`);
        params.push(parsedStudentId);
        i += 1;
      }
    }

    if (search) {
      conditions.push(`(
        s.first_name ILIKE $${i}
        OR s.last_name ILIKE $${i}
        OR s.admission_number ILIKE $${i}
        OR (s.first_name || ' ' || COALESCE(s.last_name, '')) ILIKE $${i}
        OR COALESCE(p.student_snapshot->>'full_name', '') ILIKE $${i}
        OR COALESCE(p.student_snapshot->>'admission_number', '') ILIKE $${i}
      )`);
      params.push(`%${search}%`);
      i += 1;
    }
    if (classId) {
      conditions.push(`COALESCE(ce.class_id, s.class_id) = $${i}`);
      params.push(parseInt(classId, 10));
      i += 1;
    }
    if (fromDate) {
      conditions.push(`p.report_date >= $${i}::date`);
      params.push(fromDate);
      i += 1;
    }
    if (toDate) {
      conditions.push(`p.report_date <= $${i}::date`);
      params.push(toDate);
      i += 1;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await auth.db.query(
      `SELECT p.*, s.first_name, s.last_name, s.admission_number,
              COALESCE(NULLIF(smr.blood_group, ''), NULLIF(s.blood_group, ''), p.blood_group) AS blood_group,
              smr.allergies, smr.chronic_disease, smr.disability,
              smr.doctor_name, smr.doctor_contact, smr.emergency_contact,
              COALESCE((
                SELECT json_agg(json_build_object(
                  'id', h.id,
                  'issue_date', to_char(h.issue_date, 'YYYY-MM-DD'),
                  'health_issue', h.health_issue,
                  'attended_by', h.attended_by,
                  'medicine_given', h.medicine_given,
                  'issue_status', h.issue_status
                ) ORDER BY h.issue_date DESC, h.id DESC)
                FROM student_health_issues h
                WHERE h.physical_report_id = p.id
                   OR (
                     h.physical_report_id IS NULL
                     AND h.student_id = p.student_id
                     AND p.id = (
                       SELECT p2.id FROM student_physical_reports p2
                       WHERE p2.student_id = p.student_id
                       ORDER BY p2.report_date DESC, p2.id DESC
                       LIMIT 1
                     )
                   )
              ), '[]'::json) AS health_issues
       FROM student_physical_reports p
       JOIN students s ON s.id = p.student_id
       LEFT JOIN student_medical_records smr ON smr.student_id = s.id
       LEFT JOIN LATERAL (
         SELECT e.class_id FROM student_enrollments e
         WHERE e.student_id = s.id AND e.is_current = true
         ORDER BY e.id DESC LIMIT 1
       ) ce ON true
       ${where}
       ORDER BY p.report_date DESC, p.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing physical reports:', error);
    return NextResponse.json({ success: false, error: 'Failed to load physical reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);

    const body = await request.json();
    const studentId = parseInt(String(body.student_id), 10);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'student_id is required' }, { status: 400 });
    }

    const student = await loadStudentWithClass(auth.db, studentId);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const height = parseOptionalNumber(body.height_cm);
    const weight = parseOptionalNumber(body.weight_kg);
    const bmi = calculateBmi(height, weight);

    const result = await auth.db.query(
      `INSERT INTO student_physical_reports (
        student_id, academic_year, report_date, height_cm, weight_kg, bmi,
        chest_cm, vision_left, vision_right, blood_group, remarks,
        health_issue, attended_by, medicine_given, issue_status,
        student_snapshot, recorded_by, recorded_by_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18)
      RETURNING *`,
      [
        studentId,
        body.academic_year || null,
        body.report_date || new Date().toISOString().split('T')[0],
        height,
        weight,
        bmi,
        parseOptionalNumber(body.chest_cm),
        body.vision_left?.trim() || null,
        body.vision_right?.trim() || null,
        body.blood_group?.trim() || student.blood_group || null,
        body.remarks?.trim() || null,
        body.health_issue?.trim() || null,
        body.attended_by?.trim() || null,
        body.medicine_given?.trim() || null,
        body.health_issue?.trim()
          ? body.issue_status === 'resolved'
            ? 'resolved'
            : 'open'
          : 'none',
        JSON.stringify(studentSnapshot(student)),
        auth.user.id,
        actorName(auth.user),
      ]
    );

    const issueText = body.health_issue?.trim();
    if (issueText && result.rows[0]) {
      await auth.db.query(
        `INSERT INTO student_health_issues (
          student_id, physical_report_id, academic_year, issue_date,
          health_issue, attended_by, medicine_given, issue_status,
          recorded_by, recorded_by_name
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          studentId,
          result.rows[0].id,
          body.academic_year || null,
          body.report_date || new Date().toISOString().split('T')[0],
          issueText,
          body.attended_by?.trim() || null,
          body.medicine_given?.trim() || null,
          body.issue_status === 'resolved' ? 'resolved' : 'open',
          auth.user.id,
          actorName(auth.user),
        ]
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating physical report:', error);
    return NextResponse.json({ success: false, error: 'Failed to save physical report' }, { status: 500 });
  }
}
