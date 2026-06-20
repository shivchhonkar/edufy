import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureExamsSchema, fetchExamSubjects } from '@/lib/ensure-exams-schema';
import { ensureSystemSettings } from '@/lib/ensure-system-settings';
import { mergeReportSettings } from '@/lib/report-settings';
import { buildResultMap, fetchExamResultRows } from '@/lib/exam-results-query';
import {
  buildPerformanceReports,
  type PerformanceReportType,
} from '@/services/exams/performance-report-builder';

const VALID_TYPES: PerformanceReportType[] = ['term', 'half_yearly', 'annual'];

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);
    await ensureSystemSettings(db);

    const params = request.nextUrl.searchParams;
    const classId = params.get('class_id');
    const studentId = params.get('student_id');
    const reportType = params.get('report_type') as PerformanceReportType | null;
    const examId = params.get('exam_id');
    const unitTestExamId = params.get('unit_test_exam_id');
    const halfYearlyExamId = params.get('half_yearly_exam_id');
    const unitTest1ExamId = params.get('unit_test_1_exam_id');
    const unitTest2ExamId = params.get('unit_test_2_exam_id');
    const annualExamId = params.get('annual_exam_id');

    if (!classId || !reportType || !VALID_TYPES.includes(reportType)) {
      return NextResponse.json(
        { success: false, error: 'class_id and report_type (term|half_yearly|annual) are required' },
        { status: 400 },
      );
    }

    if (reportType === 'term' && !examId) {
      return NextResponse.json({ success: false, error: 'exam_id is required for term reports' }, { status: 400 });
    }
    if (reportType === 'half_yearly' && !halfYearlyExamId) {
      return NextResponse.json(
        { success: false, error: 'half_yearly_exam_id is required for half yearly reports' },
        { status: 400 },
      );
    }
    if (reportType === 'annual' && !annualExamId) {
      return NextResponse.json(
        { success: false, error: 'annual_exam_id is required for annual reports' },
        { status: 400 },
      );
    }

    const parsedClassId = parseInt(classId, 10);
    const parsedStudentId = studentId ? parseInt(studentId, 10) : null;

    const studentQueryParams: number[] = [parsedClassId];
    let studentFilterSql = "WHERE s.status = 'active' AND s.class_id = $1";
    if (parsedStudentId) {
      studentQueryParams.push(parsedStudentId);
      studentFilterSql += ` AND s.id = $${studentQueryParams.length}`;
    }

    const [studentsRes, settingsRes] = await Promise.all([
      db.query(
        `SELECT s.*, c.name AS class_name, sec.name AS section_name
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN sections sec ON s.section_id = sec.id
         ${studentFilterSql}
         ORDER BY s.roll_number NULLS LAST, s.first_name, s.last_name`,
        studentQueryParams,
      ),
      db.query(
        'SELECT school_name, school_address, school_phone, academic_year, report_settings FROM system_settings LIMIT 1',
      ),
    ]);

    const studentIds = studentsRes.rows.map((s) => s.id as number);
    const guardiansByStudent = new Map<number, { mother?: string; father?: string }>();
    if (studentIds.length) {
      try {
        const guardiansRes = await db.query<{ student_id: number; relation_type: string; full_name: string }>(
          `SELECT student_id, relation_type, full_name
           FROM student_guardians
           WHERE student_id = ANY($1::int[])`,
          [studentIds],
        );
        for (const g of guardiansRes.rows) {
          if (!guardiansByStudent.has(g.student_id)) guardiansByStudent.set(g.student_id, {});
          const entry = guardiansByStudent.get(g.student_id)!;
          if (g.relation_type === 'mother') entry.mother = g.full_name;
          if (g.relation_type === 'father') entry.father = g.full_name;
        }
      } catch {
        // optional table
      }
    }

    const examMeta: Record<string, unknown> = {};
    const subjectMap = new Map<number, { subject_id: number; subject_name: string }>();

    async function loadExam(idStr: string | null, key: string) {
      if (!idStr) return null;
      const id = parseInt(idStr, 10);
      const examRes = await db.query('SELECT id, name, exam_type, exam_date FROM exams WHERE id = $1', [id]);
      if (!examRes.rows.length) return null;
      examMeta[key] = examRes.rows[0];
      const subs = await fetchExamSubjects(db, id);
      for (const s of subs) {
        if (!subjectMap.has(s.subject_id)) {
          subjectMap.set(s.subject_id, { subject_id: s.subject_id, subject_name: s.subject_name });
        }
      }
      return id;
    }

    const termExamId = reportType === 'term' ? await loadExam(examId, 'exam') : null;
    const utId = reportType === 'half_yearly' ? await loadExam(unitTestExamId, 'unit_test') : null;
    const hyId =
      reportType === 'half_yearly' || reportType === 'annual'
        ? await loadExam(halfYearlyExamId, 'half_yearly')
        : null;
    const ut1Id = reportType === 'annual' ? await loadExam(unitTest1ExamId, 'unit_test_1') : null;
    const ut2Id = reportType === 'annual' ? await loadExam(unitTest2ExamId, 'unit_test_2') : null;
    const annId = reportType === 'annual' ? await loadExam(annualExamId, 'annual') : null;

    if (reportType === 'term' && !termExamId) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
    }
    if (reportType === 'half_yearly' && !hyId) {
      return NextResponse.json({ success: false, error: 'Half yearly exam not found' }, { status: 404 });
    }
    if (reportType === 'annual' && !annId) {
      return NextResponse.json({ success: false, error: 'Annual exam not found' }, { status: 404 });
    }

    const subjects = Array.from(subjectMap.values()).sort((a, b) =>
      a.subject_name.localeCompare(b.subject_name),
    );

    const [examResults, utResults, hyResults, ut1Results, ut2Results, annResults] = await Promise.all([
      termExamId ? fetchExamResultRows(db, termExamId) : Promise.resolve([]),
      utId ? fetchExamResultRows(db, utId) : Promise.resolve([]),
      hyId ? fetchExamResultRows(db, hyId) : Promise.resolve([]),
      ut1Id ? fetchExamResultRows(db, ut1Id) : Promise.resolve([]),
      ut2Id ? fetchExamResultRows(db, ut2Id) : Promise.resolve([]),
      annId ? fetchExamResultRows(db, annId) : Promise.resolve([]),
    ]);

    const students = studentsRes.rows.map((s) => ({
      id: s.id as number,
      first_name: s.first_name as string,
      last_name: s.last_name as string,
      admission_number: s.admission_number as string,
      roll_number: (s.roll_number as string | null) ?? null,
      date_of_birth: (s.date_of_birth as string | null) ?? null,
      parent_name: (s.parent_name as string | null) ?? null,
      mother_name: guardiansByStudent.get(s.id as number)?.mother || null,
      father_name: guardiansByStudent.get(s.id as number)?.father || (s.parent_name as string | null) || null,
      class_name: s.class_name as string,
      section_name: (s.section_name as string | null) ?? null,
      photo_url: (s.photo_url as string | null) ?? null,
    }));

    let reportTitle = 'PERFORMANCE REPORT';
    let termLabel: string | null = null;
    if (reportType === 'term') {
      const exam = examMeta.exam as { name?: string; exam_type?: string } | undefined;
      termLabel = exam?.name?.toUpperCase() || 'TERM EXAM';
      reportTitle = `PERFORMANCE REPORT ${termLabel}`;
    } else if (reportType === 'half_yearly') {
      reportTitle = 'PERFORMANCE REPORT HALF YEARLY';
    } else {
      reportTitle = 'PERFORMANCE REPORT';
    }

    const data = buildPerformanceReports({
      reportType,
      students,
      subjects,
      resultMaps: {
        exam: termExamId ? buildResultMap(examResults) : undefined,
        unitTest: utId ? buildResultMap(utResults) : undefined,
        halfYearly: hyId ? buildResultMap(hyResults) : undefined,
        unitTest1: ut1Id ? buildResultMap(ut1Results) : undefined,
        unitTest2: ut2Id ? buildResultMap(ut2Results) : undefined,
        annual: annId ? buildResultMap(annResults) : undefined,
      },
      reportTitle,
      termLabel,
    });

    return NextResponse.json({
      success: true,
      data,
      meta: {
        report_type: reportType,
        school: settingsRes.rows[0] || {},
        report_settings: mergeReportSettings(settingsRes.rows[0]?.report_settings),
        exams: examMeta,
      },
    });
  } catch (error) {
    console.error('Performance report error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate performance reports';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
