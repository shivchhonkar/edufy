import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { resetSchoolSuperAdminPassword } from '@/lib/school-audit';
import { jsonError, jsonOk } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { id: string; userId: string } };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  const schoolId = parseInt(params.id, 10);
  const userId = parseInt(params.userId, 10);
  if (!Number.isFinite(schoolId) || !Number.isFinite(userId)) {
    return jsonError('Invalid school or user id', 400);
  }

  const body = await request.json();
  const password = String(body.password ?? body.new_password ?? '').trim();
  if (!password) {
    return jsonError('Password is required', 400);
  }

  try {
    const user = await resetSchoolSuperAdminPassword(schoolId, userId, password);
    if (!user) {
      return jsonError('Super admin user not found', 404);
    }
    return jsonOk({ user, message: 'Password updated successfully.' });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Failed to reset password', 400);
  }
}
