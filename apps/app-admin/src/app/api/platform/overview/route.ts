import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { getPlatformDashboard } from '@/lib/platform-dashboard';
import { jsonOk } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  const dashboard = await getPlatformDashboard();
  return jsonOk(dashboard);
}
