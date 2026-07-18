import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { jsonOk } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  return jsonOk({
    user: {
      id: auth.id,
      email: auth.email,
      full_name: auth.full_name,
      role: auth.role,
    },
  });
}
