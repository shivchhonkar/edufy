import { NextRequest, NextResponse } from 'next/server';
import { withExamAdminDb } from '@/lib/exam-workflow-api';
import { compileExamResults } from '@/services/exams/result-compiler';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return withExamAdminDb(
    request,
    async ({ db, user, examId }) => {
      const result = await compileExamResults(db, examId, user.id, user.tenant_id);
      return NextResponse.json({
        success: true,
        data: result,
        message: `Compiled results for ${result.students_compiled} student(s)`,
      });
    },
    params.id,
  );
}
