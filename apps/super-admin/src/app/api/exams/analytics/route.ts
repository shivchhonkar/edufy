import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { requireHrRead } from '@/lib/api-auth';
import { ensureExamResultEngineSchema } from '@/lib/ensure-exam-result-engine';
import { ensureExamsSchema } from '@/lib/ensure-exams-schema';
import { buildExamAnalytics, buildExamComparison } from '@/services/exams/exam-analytics';

export async function GET(request: NextRequest) {
  const auth = requireHrRead(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);
    await ensureExamResultEngineSchema(db);

    const examId = request.nextUrl.searchParams.get('exam_id');
    const compareIds = request.nextUrl.searchParams.get('compare');

    if (compareIds) {
      const ids = compareIds.split(',').map((id) => parseInt(id.trim(), 10)).filter(Boolean);
      const data = await buildExamComparison(db, ids);
      return NextResponse.json({ success: true, data });
    }

    if (!examId) {
      return NextResponse.json(
        { success: false, error: 'exam_id query parameter is required' },
        { status: 400 },
      );
    }

    const analytics = await buildExamAnalytics(db, parseInt(examId, 10));
    if (!analytics) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analytics failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
