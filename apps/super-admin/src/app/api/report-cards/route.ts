import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureExamsSchema } from '@/lib/ensure-exams-schema';
import { ensureExamResultEngineSchema } from '@/lib/ensure-exam-result-engine';
import { mergeReportSettings } from '@/lib/report-settings';
import { loadGradingScale, gradeFromPercentage } from '@/services/exams/grading-engine';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);
    await ensureExamResultEngineSchema(db);

    const studentId = request.nextUrl.searchParams.get('student_id');
    const classId = request.nextUrl.searchParams.get('class_id');
    const termId = request.nextUrl.searchParams.get('term_id');
    const examId = request.nextUrl.searchParams.get('exam_id');
    const onlyWithResults = request.nextUrl.searchParams.get('only_with_results') !== 'false';

    if (!studentId && !classId) {
      return NextResponse.json(
        { success: false, error: 'student_id or class_id is required' },
        { status: 400 }
      );
    }

    let studentsQuery = `
      SELECT s.*, c.name AS class_name, sec.name AS section_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE s.status = 'active'`;
    const params: (string | number)[] = [];

    if (studentId) {
      params.push(parseInt(studentId, 10));
      studentsQuery += ` AND s.id = $${params.length}`;
    }
    if (classId) {
      params.push(parseInt(classId, 10));
      studentsQuery += ` AND s.class_id = $${params.length}`;
    }
    studentsQuery += ' ORDER BY s.first_name, s.last_name';

    const students = await db.query(studentsQuery, params);

    const settings = await db.query(
      'SELECT school_name, school_address, school_phone, academic_year, report_settings FROM system_settings LIMIT 1'
    ).catch(() => ({ rows: [{}] }));

    const reportSettings = mergeReportSettings(settings.rows[0]?.report_settings);
    const gradingScale = await loadGradingScale(db);

    const reportCards = [];

    for (const student of students.rows) {
      let resultsQuery = `
        SELECT
          er.marks_obtained,
          er.grade,
          er.is_absent,
          er.remarks,
          e.id AS exam_id,
          e.name AS exam_name,
          e.exam_type,
          e.total_marks AS max_marks,
          e.passing_marks,
          e.exam_date,
          sub.name AS subject_name,
          et.name AS term_name
        FROM exam_results er
        INNER JOIN exams e ON er.exam_id = e.id
        LEFT JOIN subjects sub ON sub.id = COALESCE(er.subject_id, e.subject_id)
        LEFT JOIN exam_terms et ON e.term_id = et.id
        WHERE er.student_id = $1
          AND er.is_absent = false`;
      const resultParams: (string | number)[] = [student.id];

      if (termId) {
        resultParams.push(parseInt(termId, 10));
        resultsQuery += ` AND e.term_id = $${resultParams.length}`;
      }

      if (examId) {
        resultParams.push(parseInt(examId, 10));
        resultsQuery += ` AND e.id = $${resultParams.length}`;
      }

      resultsQuery += ' ORDER BY e.exam_date DESC, sub.name ASC';

      const results = await db.query(resultsQuery, resultParams);
      const marks = results.rows;

      if (onlyWithResults && marks.length === 0) {
        continue;
      }

      const totalObtained = marks.reduce(
        (s: number, r: { marks_obtained: string }) => s + parseFloat(r.marks_obtained || '0'),
        0
      );
      const totalMax = marks.reduce(
        (s: number, r: { max_marks: string | number }) => s + parseFloat(String(r.max_marks || '0')),
        0
      );
      const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;
      const passed = marks.filter(
        (r: { grade: string }) => r.grade && r.grade !== 'F'
      ).length;

      reportCards.push({
        student,
        school: settings.rows[0],
        subjects: marks,
        summary: {
          total_subjects: marks.length,
          passed_subjects: passed,
          total_obtained: totalObtained,
          total_max: totalMax,
          percentage,
          overall_grade: gradeFromPercentage(percentage, gradingScale).grade,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: reportCards,
      meta: { report_settings: reportSettings },
    });
  } catch (error) {
    console.error('Report cards error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate report cards';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
