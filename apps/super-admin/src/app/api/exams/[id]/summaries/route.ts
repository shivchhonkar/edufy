import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { requireHrRead } from '@/lib/api-auth';
import { ensureExamResultEngineSchema } from '@/lib/ensure-exam-result-engine';
import { ensureExamsSchema } from '@/lib/ensure-exams-schema';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireHrRead(request);
  if (auth instanceof NextResponse) return auth;

  const examId = parseInt(params.id, 10);
  if (Number.isNaN(examId)) {
    return NextResponse.json({ success: false, error: 'Invalid exam id' }, { status: 400 });
  }

  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);
    await ensureExamResultEngineSchema(db);

    const publishOnly = request.nextUrl.searchParams.get('published_only') === 'true';

    let query = `
      SELECT ses.*, s.first_name, s.last_name, s.roll_number, s.admission_number,
             sec.name AS section_name
      FROM student_exam_summary ses
      JOIN students s ON s.id = ses.student_id
      LEFT JOIN sections sec ON sec.id = ses.section_id
      WHERE ses.exam_id = $1`;
    if (publishOnly) query += ` AND ses.publish_status = 'published'`;
    query += ` ORDER BY ses.class_rank NULLS LAST, ses.percentage DESC, s.first_name`;

    const result = await db.query(query, [examId]);

    const stats = await db.query<{
      pass_count: string;
      fail_count: string;
      avg_percentage: string;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE result_status = 'PASS') AS pass_count,
        COUNT(*) FILTER (WHERE result_status = 'FAIL') AS fail_count,
        COALESCE(AVG(percentage), 0) AS avg_percentage
       FROM student_exam_summary WHERE exam_id = $1`,
      [examId],
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      meta: stats.rows[0] ?? {},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch summaries';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
