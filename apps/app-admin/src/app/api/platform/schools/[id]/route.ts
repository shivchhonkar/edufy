import { NextRequest } from 'next/server';
import { withPlatformAdmin } from '@/lib/platform-route';
import { deleteInactiveSchool } from '@/lib/school-audit';
import { jsonError, jsonOk } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { id: string } };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withPlatformAdmin(request, async () => {
    const schoolId = parseInt(params.id, 10);
    if (!Number.isFinite(schoolId)) {
      return jsonError('Invalid school id', 400);
    }

    let confirmSlug = request.nextUrl.searchParams.get('confirm_slug') ?? '';
    if (!confirmSlug) {
      try {
        const body = (await request.json()) as { confirm_slug?: string };
        confirmSlug = String(body.confirm_slug ?? '');
      } catch {
        // DELETE may have no body
      }
    }

    if (!confirmSlug.trim()) {
      return jsonError('confirm_slug is required to delete a school', 400);
    }

    const result = await deleteInactiveSchool(schoolId, confirmSlug);
    return jsonOk({
      deleted: true,
      school: result,
      message: result.database_dropped
        ? 'School removed and database dropped.'
        : 'School removed from registry. Database could not be dropped — check server logs.',
    });
  });
}
