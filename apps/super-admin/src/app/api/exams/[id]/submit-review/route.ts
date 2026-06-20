import { NextRequest, NextResponse } from 'next/server';
import { withExamAdminDb } from '@/lib/exam-workflow-api';
import { transitionExamWorkflow } from '@/services/exams/exam-audit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return withExamAdminDb(
    request,
    async ({ db, user, examId }) => {
      const transition = await transitionExamWorkflow(db, examId, 'under_review', {
        id: user.id,
        role: user.role,
        tenant_id: user.tenant_id,
      });
      return NextResponse.json({
        success: true,
        data: transition,
        message: 'Exam submitted for review',
      });
    },
    params.id,
  );
}
