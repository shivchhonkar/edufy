import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { requireHrAdmin } from '@/lib/api-auth';
import { ensureExamResultEngineSchema } from '@/lib/ensure-exam-result-engine';
import { ensureExamsSchema } from '@/lib/ensure-exams-schema';

export async function withExamAdminDb(
  request: NextRequest,
  handler: (ctx: {
    db: Awaited<ReturnType<typeof getRequestDb>>['db'];
    user: { id: number; role?: string; tenant_id?: number };
    examId: number;
  }) => Promise<NextResponse>,
  examIdParam: string,
) {
  const auth = requireHrAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const examId = parseInt(examIdParam, 10);
  if (Number.isNaN(examId)) {
    return NextResponse.json({ success: false, error: 'Invalid exam id' }, { status: 400 });
  }

  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);
    await ensureExamResultEngineSchema(db);
    return handler({ db, user: auth.user, examId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const status = message.includes('not found') ? 404 : message.includes('Cannot transition') ? 409 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
