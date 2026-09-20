import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureExamsSchema } from '@/lib/ensure-exams-schema';
import { ensureExamOperationsSchema } from '@/lib/ensure-exam-operations-schema';

export const ACTIVITY_GRADE_OPTIONS = ['A+', 'A', 'B', 'C', 'D'];

export async function requireExamOps(request: NextRequest) {
  const auth = await getAuthenticatedDb(request);
  if (auth instanceof NextResponse) return auth;
  await ensureExamsSchema(auth.db);
  await ensureExamOperationsSchema(auth.db);
  return auth;
}

export const EXAM_STUDENT_SELECT = `
  s.id AS student_id,
  s.first_name,
  s.last_name,
  s.admission_number,
  s.roll_number
`;
