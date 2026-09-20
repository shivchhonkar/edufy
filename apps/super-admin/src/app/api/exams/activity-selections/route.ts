import { NextRequest, NextResponse } from 'next/server';
import { requireExamOps } from '@/lib/exam-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const classId = request.nextUrl.searchParams.get('class_id');
    const examId = request.nextUrl.searchParams.get('exam_id');
    const params: unknown[] = [];
    const conditions: string[] = [];
    if (classId) {
      params.push(Number(classId));
      conditions.push(`sel.class_id = $${params.length}`);
    }
    if (examId) {
      params.push(Number(examId));
      conditions.push(`sel.exam_id = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await auth.db.query(
      `SELECT sel.*, a.name AS activity_name, a.category, c.name AS class_name, e.name AS exam_name
       FROM exam_activity_selections sel
       JOIN exam_activity_masters a ON a.id = sel.activity_id
       LEFT JOIN classes c ON c.id = sel.class_id
       LEFT JOIN exams e ON e.id = sel.exam_id
       ${where}
       ORDER BY a.sort_order, a.name`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing activity selections:', error);
    return NextResponse.json({ success: false, error: 'Failed to load activity selection' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const classId = Number(body.class_id);
    const examId = Number(body.exam_id);
    const activityIds: number[] = Array.isArray(body.activity_ids)
      ? body.activity_ids.map((id: unknown) => Number(id)).filter((id: number) => id > 0)
      : [];

    if (!classId || !examId) {
      return NextResponse.json({ success: false, error: 'Class and exam are required' }, { status: 400 });
    }

    await auth.db.query(
      `DELETE FROM exam_activity_selections WHERE class_id = $1 AND exam_id = $2`,
      [classId, examId]
    );

    const saved = [];
    for (const activityId of activityIds) {
      const result = await auth.db.query(
        `INSERT INTO exam_activity_selections (activity_id, class_id, exam_id, academic_year)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (activity_id, class_id, exam_id) DO NOTHING
         RETURNING *`,
        [activityId, classId, examId, body.academic_year || null]
      );
      if (result.rows[0]) saved.push(result.rows[0]);
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving activity selections:', error);
    return NextResponse.json({ success: false, error: 'Failed to save activity selection' }, { status: 500 });
  }
}
