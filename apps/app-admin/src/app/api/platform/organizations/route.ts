import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { listOrganizationsWithSubscriptions } from '@/lib/subscriptions';
import { jsonOk } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  const organizations = await listOrganizationsWithSubscriptions();
  return jsonOk({ organizations });
}
