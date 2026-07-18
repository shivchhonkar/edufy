import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { getSchoolSuperAdmins } from '@/lib/school-audit';
import { jsonError, jsonOk } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  const schoolId = parseInt(params.id, 10);
  if (!Number.isFinite(schoolId)) {
    return jsonError('Invalid school id', 400);
  }

  const superAdmins = await getSchoolSuperAdmins(schoolId);
  return jsonOk({ super_admins: superAdmins });
}
