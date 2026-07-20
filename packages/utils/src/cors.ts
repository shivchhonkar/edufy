import { NextRequest, NextResponse } from 'next/server';

/** Expo web + local dev origins allowed for browser-based mobile clients. */
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19006',
  'http://localhost:19000',
  'http://localhost:19001',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082',
  'http://127.0.0.1:19006',
];

function getAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ALLOWED_ORIGINS?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (fromEnv?.length) {
    return [...new Set([...fromEnv, ...DEFAULT_DEV_ORIGINS])];
  }

  // Native mobile apps are not subject to CORS; these origins are for Expo web dev
  // (localhost:8081, etc.) when testing against a deployed API.
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

export function corsJsonResponse(
  request: NextRequest,
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  return applyCorsHeaders(NextResponse.json(body, init), request.headers.get('origin'));
}

export function corsApiResponse(request: NextRequest, response: Response): NextResponse {
  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  return applyCorsHeaders(nextResponse, request.headers.get('origin'));
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

/** Respond immediately to browser OPTIONS preflight for /api routes. */
export function handleApiCorsPreflight(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return null;
  }

  return handleCorsPreflight(request);
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

  const origin = request.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);
  const response = NextResponse.next();

  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

type RouteHandlers = Partial<Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS', RouteHandler>>;

/** Wrap App Router handlers so responses always include CORS headers. */
export function withCorsRouteHandlers(handlers: RouteHandlers): RouteHandlers {
  const wrapped: RouteHandlers = {};

  for (const [method, handler] of Object.entries(handlers) as [keyof RouteHandlers, RouteHandler][]) {
    wrapped[method] = async (request, context) => {
      const preflight = handleCorsPreflight(request);
      if (preflight) {
        return preflight;
      }

      const response = await handler(request, context);
      if (response instanceof NextResponse) {
        return applyCorsHeaders(response, request.headers.get('origin'));
      }

      return corsApiResponse(request, response);
    };
  }

  return wrapped;
}
