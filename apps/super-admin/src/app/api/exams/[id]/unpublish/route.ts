import { NextRequest, NextResponse } from 'next/server';
import { withExamAdminDb } from '@/lib/exam-workflow-api';
import {
  transitionExamWorkflow,
  unpublishExamSummaries,
  logExamResultAudit,
} from '@/services/exams/exam-audit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return withExamAdminDb(
    request,
    async ({ db, user, examId }) => {
      const unpublishedCount = await unpublishExamSummaries(db, examId);
      const transition = await transitionExamWorkflow(db, examId, 'draft', {
        id: user.id,
        role: user.role,
        tenant_id: user.tenant_id,
      });

      await logExamResultAudit(db, {
        exam_id: examId,
        action: 'unpublish_summaries',
        actor_id: user.id,
        actor_role: user.role,
        tenant_id: user.tenant_id,
        metadata: { summaries_unpublished: unpublishedCount },
      });

      return NextResponse.json({
        success: true,
        data: { ...transition, summaries_unpublished: unpublishedCount },
        message: 'Results unpublished and moved to draft',
      });
    },
    params.id,
  );
}
