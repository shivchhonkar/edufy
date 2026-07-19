import { NextRequest, NextResponse } from 'next/server';
import { handleApiCors } from '@edulakhya/utils/cors';

export function middleware(request: NextRequest) {
  const corsResponse = handleApiCors(request);
  if (corsResponse) {
    return corsResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
