import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export interface ParentSession {
  login?: string;
  phone?: string;
  studentIds: number[];
  role: 'parent';
}

export function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export function verifyParentToken(token: string): ParentSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ParentSession;
    if (decoded.role !== 'parent' || !Array.isArray(decoded.studentIds)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function getParentSession(request: NextRequest): ParentSession | null {
  const token = getBearerToken(request);
  if (!token) return null;
  return verifyParentToken(token);
}

export function parentCanAccessStudent(session: ParentSession, studentId: number): boolean {
  return session.studentIds.includes(studentId);
}

export function parseStudentIdParam(id: string): number | null {
  const parsed = parseInt(id, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function unauthorizedResponse() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
}

export function requireParentStudentAccess(
  request: NextRequest,
  studentId: number
): ParentSession | NextResponse {
  const session = getParentSession(request);
  if (!session) return unauthorizedResponse();
  if (!parentCanAccessStudent(session, studentId)) return forbiddenResponse();
  return session;
}

export function requireParentSession(request: NextRequest): ParentSession | NextResponse {
  const session = getParentSession(request);
  if (!session) return unauthorizedResponse();
  return session;
}
