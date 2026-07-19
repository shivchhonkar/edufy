import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:19000',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
];

function getAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ALLOWED_ORIGINS?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (fromEnv?.length) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === 'production') {
    return [];
  }

  return DEFAULT_DEV_ORIGINS;
}

export function isAllowedCorsOrigin(origin: string | null): boolean {
  if (!origin) {
    return false;
  }

  return getAllowedOrigins().includes(origin);
}

export function buildCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !isAllowedCorsOrigin(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

export function applyCorsHeaders(
  response: NextResponse,
  origin: string | null,
): NextResponse {
  for (const [key, value] of Object.entries(buildCorsHeaders(origin))) {
    response.headers.set(key, value);
  }

  return response;
}

export function withCors(response: NextResponse, request: NextRequest): NextResponse {
  return applyCorsHeaders(response, request.headers.get('origin'));
}

export function handleCorsPreflight(request: NextRequest): NextResponse | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  const origin = request.headers.get('origin');
  if (!isAllowedCorsOrigin(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

/** Apply CORS headers to every /api response (for mobile + Expo web clients). */
export function handleApiCors(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return null;
  }

  const preflight = handleCorsPreflight(request);
  if (preflight) {
    return preflight;
  }

  return withCors(NextResponse.next(), request);
}
