import { NextRequest } from 'next/server';
import { withPlatformAdmin } from '@/lib/platform-route';
import { listOrganizationsWithSubscriptions } from '@/lib/subscriptions';
import { jsonOk } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withPlatformAdmin(request, async () => {
    const organizations = await listOrganizationsWithSubscriptions();
    return jsonOk({ organizations });
  });
}
