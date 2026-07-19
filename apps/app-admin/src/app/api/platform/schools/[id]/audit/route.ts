import { NextRequest } from 'next/server';
import { withPlatformAdmin } from '@/lib/platform-route';
import { getSchoolAuditReport } from '@/lib/school-audit';
import { jsonError, jsonOk } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withPlatformAdmin(request, async () => {
    const schoolId = parseInt(params.id, 10);
    if (!Number.isFinite(schoolId)) {
      return jsonError('Invalid school id', 400);
    }

    const report = await getSchoolAuditReport(schoolId);
    if (!report) {
      return jsonError('School not found', 404);
    }

    return jsonOk({ report });
  });
}
