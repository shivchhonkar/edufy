import { NextRequest, NextResponse } from 'next/server';
import { isSchoolCodeAvailable } from '@edulakhya/tenant';

/** Check if a public school code is available during registration. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim() ?? '';
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (normalized.length < 3) {
    return NextResponse.json({
      success: true,
      data: { available: false, code: normalized, reason: 'too_short' },
    });
  }

  const available = await isSchoolCodeAvailable(normalized);

  return NextResponse.json({
    success: true,
    data: { available, code: normalized },
  });
}
