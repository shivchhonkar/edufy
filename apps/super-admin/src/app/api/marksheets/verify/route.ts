import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureSystemSettings } from '@/lib/ensure-system-settings';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureSystemSettings(db);

    const admission = request.nextUrl.searchParams.get('adm')?.trim();
    const serial = request.nextUrl.searchParams.get('serial')?.trim();
    const academicYear = request.nextUrl.searchParams.get('ay')?.trim();

    if (!admission || !serial) {
      return NextResponse.json(
        { success: false, error: 'adm and serial query parameters are required' },
        { status: 400 }
      );
    }

    const [studentRes, settingsRes] = await Promise.all([
      db.query<{
        id: number;
        first_name: string;
        last_name: string;
        admission_number: string;
        roll_number: string | null;
        class_name: string;
        section_name: string | null;
        status: string;
      }>(
        `SELECT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number, s.status,
                c.name AS class_name, sec.name AS section_name
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN sections sec ON s.section_id = sec.id
         WHERE s.admission_number = $1
         LIMIT 1`,
        [admission]
      ),
      db.query(
        `SELECT school_name, academic_year FROM system_settings ORDER BY id DESC LIMIT 1`
      ),
    ]);

    const student = studentRes.rows[0];
    if (!student) {
      return NextResponse.json({
        success: true,
        verified: false,
        message: 'No student record found for this admission number.',
      });
    }

    const serialMatches =
      serial.includes(student.admission_number) &&
      (!academicYear || serial.includes(academicYear.replace(/\//g, '')) || serial.includes(academicYear));

    if (!serialMatches) {
      return NextResponse.json({
        success: true,
        verified: false,
        message: 'Serial number does not match this student record.',
        student: {
          admission_number: student.admission_number,
          name: `${student.first_name} ${student.last_name}`,
        },
      });
    }

    const ay = academicYear || (settingsRes.rows[0]?.academic_year as string) || '';
    let examSummary: {
      exam_name: string;
      exam_type: string;
      total_obtained: number;
      total_max: number;
      percentage: number;
    } | null = null;

    if (student.status === 'active') {
      const resultsRes = await db.query<{
        exam_name: string;
        exam_type: string;
        total_obtained: string;
        total_max: string;
      }>(
        `SELECT e.name AS exam_name, e.exam_type,
                SUM(er.marks_obtained)::text AS total_obtained,
                SUM(COALESCE(es.total_marks, es.max_marks, e.total_marks))::text AS total_max
         FROM exam_results er
         JOIN exams e ON e.id = er.exam_id
         LEFT JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = er.subject_id
         WHERE er.student_id = $1 AND er.is_absent = false
           AND ($2 = '' OR e.academic_year = $2 OR e.academic_year IS NULL)
         GROUP BY e.id, e.name, e.exam_type, e.exam_date
         ORDER BY e.exam_date DESC NULLS LAST
         LIMIT 1`,
        [student.id, ay]
      );

      if (resultsRes.rows[0]) {
        const row = resultsRes.rows[0];
        const obtained = parseFloat(row.total_obtained || '0');
        const max = parseFloat(row.total_max || '0');
        examSummary = {
          exam_name: row.exam_name,
          exam_type: row.exam_type,
          total_obtained: obtained,
          total_max: max,
          percentage: max > 0 ? Math.round((obtained / max) * 10000) / 100 : 0,
        };
      }
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Marksheet record verified successfully.',
      school: {
        name: settingsRes.rows[0]?.school_name || 'School',
        academic_year: ay,
      },
      student: {
        name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        roll_number: student.roll_number,
        class_name: student.class_name,
        section_name: student.section_name,
        status: student.status,
      },
      serial_no: serial,
      latest_exam: examSummary,
    });
  } catch (error) {
    console.error('Marksheet verify error:', error);
    const message = error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
