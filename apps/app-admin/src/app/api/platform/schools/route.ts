import { NextRequest } from 'next/server';
import { withPlatformAdmin } from '@/lib/platform-route';
import { listPlatformSchools } from '@/lib/school-audit';
import { jsonOk } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withPlatformAdmin(request, async () => {
    const schools = await listPlatformSchools();
    return jsonOk({ schools });
  });
}
