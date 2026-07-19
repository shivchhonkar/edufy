import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { getPlatformDashboard } from '@/lib/platform-dashboard';
import { jsonOk, jsonError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const dashboard = await getPlatformDashboard();
    return jsonOk(dashboard);
  } catch (error) {
    console.error('Platform overview error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load platform overview';
    return jsonError(message, 500);
  }
}
