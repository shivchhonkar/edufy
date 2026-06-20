import { NextRequest, NextResponse } from 'next/server';
import { withExamAdminDb } from '@/lib/exam-workflow-api';
import {
  transitionExamWorkflow,
  publishExamSummaries,
  logExamResultAudit,
} from '@/services/exams/exam-audit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return withExamAdminDb(
    request,
    async ({ db, user, examId }) => {
      const compiled = await db.query(
        `SELECT COUNT(*)::int AS count FROM student_exam_summary WHERE exam_id = $1`,
        [examId],
      );
      if ((compiled.rows[0]?.count as number) === 0) {
        return NextResponse.json(
          { success: false, error: 'Compile results before publishing' },
          { status: 400 },
        );
      }

      const transition = await transitionExamWorkflow(db, examId, 'published', {
        id: user.id,
        role: user.role,
        tenant_id: user.tenant_id,
      });
      const publishedCount = await publishExamSummaries(db, examId, user.id);

      await logExamResultAudit(db, {
        exam_id: examId,
        action: 'publish_summaries',
        actor_id: user.id,
        actor_role: user.role,
        tenant_id: user.tenant_id,
        metadata: { summaries_published: publishedCount },
      });

      return NextResponse.json({
        success: true,
        data: { ...transition, summaries_published: publishedCount },
        message: `Published ${publishedCount} student summary record(s)`,
      });
    },
    params.id,
  );
}
