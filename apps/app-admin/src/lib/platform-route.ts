import { NextRequest, NextResponse } from 'next/server';
import type { JwtPayload } from '@edulakhya/auth';
import { jsonError } from '@/lib/api-response';
import { ensureControlSchema } from '@/lib/ensure-control-schema';
import { requirePlatformAdmin } from '@/lib/platform-auth';

export async function withPlatformAdmin(
  request: NextRequest,
  handler: (auth: JwtPayload) => Promise<NextResponse>,
): Promise<NextResponse> {
  const auth = requirePlatformAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureControlSchema();
    return await handler(auth);
  } catch (error) {
    console.error('Platform API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return jsonError(message, 500);
  }
}
