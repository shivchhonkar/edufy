import { NextRequest, NextResponse } from 'next/server';
import { requireExamOps } from '@/lib/exam-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const examId = request.nextUrl.searchParams.get('exam_id');
    const classId = request.nextUrl.searchParams.get('class_id');
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20', 10) || 20, 100);

    const params: unknown[] = [];
    const conditions = [`ses.publish_status IN ('draft', 'published')`];
    if (examId) {
      params.push(Number(examId));
      conditions.push(`ses.exam_id = $${params.length}`);
    }
    if (classId) {
      params.push(Number(classId));
      conditions.push(`ses.class_id = $${params.length}`);
    }

    const result = await auth.db.query(
      `SELECT ses.*, s.first_name, s.last_name, s.admission_number, s.roll_number,
              e.name AS exam_name, e.exam_type, c.name AS class_name, sec.name AS section_name
       FROM student_exam_summary ses
       JOIN students s ON s.id = ses.student_id
       JOIN exams e ON e.id = ses.exam_id
       LEFT JOIN classes c ON c.id = ses.class_id
       LEFT JOIN sections sec ON sec.id = ses.section_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ses.percentage DESC, ses.class_rank ASC NULLS LAST, s.first_name
       LIMIT ${limit}`,
      params
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing rank holders:', error);
    return NextResponse.json({ success: false, error: 'Failed to load rank holders' }, { status: 500 });
  }
}
