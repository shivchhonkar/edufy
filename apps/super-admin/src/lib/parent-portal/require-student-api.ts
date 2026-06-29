import { NextRequest, NextResponse } from 'next/server';
import {
  parseStudentIdParam,
  requireParentStudentAccess,
} from '@/lib/parent-auth'

export function requireStudentFromParams(
  request: NextRequest,
  id: string
): { studentId: number } | NextResponse {
  const studentId = parseStudentIdParam(id);
  if (!studentId) {
    return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
  }

  const auth = requireParentStudentAccess(request, studentId);
  if (auth instanceof NextResponse) return auth;

  return { studentId };
}

export function requireStudentFromQuery(
  request: NextRequest
): { studentId: number } | NextResponse {
  const studentIdParam = request.nextUrl.searchParams.get('studentId');
  if (!studentIdParam) {
    return NextResponse.json(
      { success: false, error: 'Student ID is required' },
      { status: 400 }
    );
  }

  return requireStudentFromParams(request, studentIdParam);
}
