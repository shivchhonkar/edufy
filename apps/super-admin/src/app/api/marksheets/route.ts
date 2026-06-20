import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureExamsSchema, fetchExamSubjects } from '@/lib/ensure-exams-schema';
import { cbseGrade, overallGradeLabel } from '@/lib/exam-grades';
import { ensureSystemSettings } from '@/lib/ensure-system-settings';
import { mergeReportSettings } from '@/lib/report-settings';

type ResultRow = {
  student_id: number;
  subject_id: number;
  subject_name: string;
  marks_obtained: number;
  max_marks: number;
  passing_marks: number;
};

async function fetchExamResultRows(db: Awaited<ReturnType<typeof getRequestDb>>['db'], examId: number) {
  const result = await db.query<{
    student_id: number;
    subject_id: number;
    subject_name: string;
    marks_obtained: string;
    max_marks: string | number;
    passing_marks: string | number;
  }>(
    `SELECT
      er.student_id,
      COALESCE(er.subject_id, e.subject_id) AS subject_id,
      sub.name AS subject_name,
      er.marks_obtained,
      COALESCE(es.total_marks, es.max_marks, e.total_marks) AS max_marks,
      COALESCE(es.passing_marks, es.pass_marks, e.passing_marks) AS passing_marks
    FROM exam_results er
    JOIN exams e ON er.exam_id = e.id
    LEFT JOIN exam_subjects es ON es.exam_id = e.id
      AND es.subject_id = COALESCE(er.subject_id, e.subject_id)
    LEFT JOIN subjects sub ON sub.id = COALESCE(er.subject_id, e.subject_id)
    WHERE er.exam_id = $1 AND er.is_absent = false`,
    [examId]
  );

  return result.rows.map((r) => ({
    student_id: r.student_id,
    subject_id: r.subject_id,
    subject_name: r.subject_name,
    marks_obtained: parseFloat(r.marks_obtained || '0'),
    max_marks: parseFloat(String(r.max_marks || '0')),
    passing_marks: parseFloat(String(r.passing_marks || '0')),
  }));
}

function buildResultMap(rows: ResultRow[]) {
  const map = new Map<number, Map<number, ResultRow>>();
  for (const row of rows) {
    if (!row.subject_id) continue;
    if (!map.has(row.student_id)) map.set(row.student_id, new Map());
    map.get(row.student_id)!.set(row.subject_id, row);
  }
  return map;
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);
    await ensureSystemSettings(db);

    const classId = request.nextUrl.searchParams.get('class_id');
    const studentId = request.nextUrl.searchParams.get('student_id');
    const halfYearlyExamId = request.nextUrl.searchParams.get('half_yearly_exam_id');
    const annualExamId = request.nextUrl.searchParams.get('annual_exam_id');

    if (!classId || !annualExamId) {
      return NextResponse.json(
        { success: false, error: 'class_id and annual_exam_id are required' },
        { status: 400 }
      );
    }

    const annualId = parseInt(annualExamId, 10);
    const halfId = halfYearlyExamId ? parseInt(halfYearlyExamId, 10) : null;
    const parsedStudentId = studentId ? parseInt(studentId, 10) : null;

    const studentQueryParams: number[] = [parseInt(classId, 10)];
    let studentFilterSql = 'WHERE s.status = \'active\' AND s.class_id = $1';
    if (parsedStudentId) {
      studentQueryParams.push(parsedStudentId);
      studentFilterSql += ` AND s.id = $${studentQueryParams.length}`;
    }

    const [annualExam, halfExam, studentsRes, settingsRes] = await Promise.all([
      db.query('SELECT id, name, exam_type, exam_date, class_id FROM exams WHERE id = $1', [annualId]),
      halfId ? db.query('SELECT id, name, exam_type, exam_date FROM exams WHERE id = $1', [halfId]) : Promise.resolve({ rows: [] }),
      db.query(
        `SELECT s.*, c.name AS class_name, sec.name AS section_name
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN sections sec ON s.section_id = sec.id
         ${studentFilterSql}
         ORDER BY s.roll_number NULLS LAST, s.first_name, s.last_name`,
        studentQueryParams
      ),
      db.query('SELECT school_name, school_address, school_phone, academic_year, report_settings FROM system_settings LIMIT 1'),
    ]);

    if (!annualExam.rows.length) {
      return NextResponse.json({ success: false, error: 'Annual exam not found' }, { status: 404 });
    }

    const annualSubjects = await fetchExamSubjects(db, annualId);
    const halfSubjects = halfId ? await fetchExamSubjects(db, halfId) : [];

    const subjectMap = new Map<number, { subject_id: number; subject_name: string }>();
    for (const s of annualSubjects) {
      subjectMap.set(s.subject_id, { subject_id: s.subject_id, subject_name: s.subject_name });
    }
    for (const s of halfSubjects) {
      if (!subjectMap.has(s.subject_id)) {
        subjectMap.set(s.subject_id, { subject_id: s.subject_id, subject_name: s.subject_name });
      }
    }

    const subjects = Array.from(subjectMap.values()).sort((a, b) =>
      a.subject_name.localeCompare(b.subject_name)
    );

    const studentIds = studentsRes.rows.map((s) => s.id as number);
    const guardiansByStudent = new Map<number, { mother?: string; father?: string }>();
    if (studentIds.length) {
      try {
        const guardiansRes = await db.query<{ student_id: number; relation_type: string; full_name: string }>(
          `SELECT student_id, relation_type, full_name
           FROM student_guardians
           WHERE student_id = ANY($1::int[])`,
          [studentIds]
        );
        for (const g of guardiansRes.rows) {
          if (!guardiansByStudent.has(g.student_id)) guardiansByStudent.set(g.student_id, {});
          const entry = guardiansByStudent.get(g.student_id)!;
          if (g.relation_type === 'mother') entry.mother = g.full_name;
          if (g.relation_type === 'father') entry.father = g.full_name;
        }
      } catch {
        // student_guardians may not exist on older tenant DBs
      }
    }

    const [annualResults, halfResults] = await Promise.all([
      fetchExamResultRows(db, annualId),
      halfId ? fetchExamResultRows(db, halfId) : Promise.resolve([]),
    ]);

    const annualMap = buildResultMap(annualResults);
    const halfMap = buildResultMap(halfResults);

    const marksheets = [];

    for (const student of studentsRes.rows) {
      const sid = student.id as number;
      const subjectRows = [];
      let grandHalfMax = 0;
      let grandHalfObtained = 0;
      let grandAnnualMax = 0;
      let grandAnnualObtained = 0;
      let allPassed = true;
      let hasAnyMark = false;

      for (const sub of subjects) {
        const half = halfMap.get(sid)?.get(sub.subject_id);
        const annual = annualMap.get(sid)?.get(sub.subject_id);

        const halfMax = half?.max_marks ?? 0;
        const halfObt = half?.marks_obtained ?? 0;
        const annualMax = annual?.max_marks ?? 0;
        const annualObt = annual?.marks_obtained ?? 0;

        if (half || annual) hasAnyMark = true;

        const totalMax = halfMax + annualMax;
        const totalObt = halfObt + annualObt;
        const pct = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
        const { grade, remarks } = cbseGrade(pct);

        const passThreshold = (half?.passing_marks ?? 0) + (annual?.passing_marks ?? 0);
        const passed = totalMax === 0 || totalObt >= passThreshold;
        if (!passed && totalMax > 0) allPassed = false;

        grandHalfMax += halfMax;
        grandHalfObtained += halfObt;
        grandAnnualMax += annualMax;
        grandAnnualObtained += annualObt;

        subjectRows.push({
          subject_id: sub.subject_id,
          subject_name: sub.subject_name,
          half_yearly: half ? { max_marks: halfMax, marks_obtained: halfObt } : null,
          annual: annual ? { max_marks: annualMax, marks_obtained: annualObt } : null,
          total_max: totalMax,
          total_obtained: totalObt,
          percentage: Math.round(pct * 100) / 100,
          grade,
          remarks,
          passed,
        });
      }

      if (!hasAnyMark) continue;

      const grandTotalMax = grandHalfMax + grandAnnualMax;
      const grandTotalObt = grandHalfObtained + grandAnnualObtained;
      const overallPct = grandTotalMax > 0 ? (grandTotalObt / grandTotalMax) * 100 : 0;
      const overall = cbseGrade(overallPct);

      marksheets.push({
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          admission_number: student.admission_number,
          roll_number: student.roll_number,
          date_of_birth: student.date_of_birth,
          parent_name: student.parent_name,
          mother_name: guardiansByStudent.get(sid)?.mother || null,
          father_name: guardiansByStudent.get(sid)?.father || student.parent_name || null,
          class_name: student.class_name,
          section_name: student.section_name,
          photo_url: student.photo_url,
        },
        subjects: subjectRows,
        summary: {
          half_yearly_total: { max: grandHalfMax, obtained: grandHalfObtained },
          annual_total: { max: grandAnnualMax, obtained: grandAnnualObtained },
          grand_total: { max: grandTotalMax, obtained: grandTotalObt },
          percentage: Math.round(overallPct * 100) / 100,
          overall_grade: overall.grade,
          overall_remarks: overall.remarks,
          overall_grade_label: overallGradeLabel(overallPct),
          result: allPassed && overallPct >= 33 ? 'PASS' : 'FAIL',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: marksheets,
      meta: {
        annual_exam: annualExam.rows[0],
        half_yearly_exam: halfExam.rows[0] || null,
        school: settingsRes.rows[0] || {},
        report_settings: mergeReportSettings(settingsRes.rows[0]?.report_settings),
        subjects,
      },
    });
  } catch (error) {
    console.error('Marksheet error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate marksheets';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
