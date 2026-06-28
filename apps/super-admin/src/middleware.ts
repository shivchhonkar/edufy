import { NextRequest, NextResponse } from 'next/server';
import { extractSubdomain, shouldValidateTenant } from '@/lib/tenant-host';

const PUBLIC_PATHS = ['/login', '/register-school', '/verify', '/school-unavailable'];

/** Legacy academic URLs → /academics/* (query string preserved) */
const ACADEMIC_ROUTE_REDIRECTS: [string, string][] = [
  ['/classes', '/academics/classes'],
  ['/subjects', '/academics/subjects'],
  ['/timetable', '/academics/timetable'],
  ['/academics/homework', '/homework'],
  ['/teachers/syllabus', '/academics/syllabus'],
  ['/teachers', '/hr/dashboard'],
  ['/hr/teacher-assignments', '/academics/teacher-assignments'],
];

/** Legacy fee tab URLs → new task-based routes */
const FEE_TAB_REDIRECTS: Record<string, string> = {
  overview: '/fees/dashboard',
  students: '/fees/collect',
  structures: '/fees/setup/structures',
};

const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/tenant/check',
  '/api/tenant/branding',
  '/api/platform/schools/register',
  '/api/platform/schools/check-slug',
  '/api/marksheets/verify',
];

const SUPER_ADMIN_API_PATHS = [
  '/api/add-subject-column',
  '/api/setup-exams',
  '/api/setup-subjects',
  '/api/fix-exams',
  '/api/check-exams-table',
  '/api/migrate-attendance',
  '/api/system/optimize',
  '/api/system/performance',
  '/api/settings/initialize-system',
  '/api/auth/register',
];

function getToken(request: NextRequest): string | null {
  return (
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null
  );
}

/** Edge-safe JWT payload decode (middleware only — full verify in API handlers) */
function getRoleFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const token = getToken(request);
  const pathname = request.nextUrl.pathname;
  const isPublicPage = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isApiRoute = pathname.startsWith('/api');

  const host = request.headers.get('host');
  const subdomain = extractSubdomain(host);

  if (subdomain && shouldValidateTenant(pathname)) {
    try {
      const checkUrl = new URL('/api/tenant/check', request.nextUrl.origin);
      const checkResponse = await fetch(checkUrl.toString(), {
        headers: {
          'x-tenant-host': host ?? '',
        },
        cache: 'no-store',
      });

      if (checkResponse.ok) {
        const payload = (await checkResponse.json()) as { exists?: boolean | null };
        if (payload.exists === false) {
          const rewriteUrl = request.nextUrl.clone();
          rewriteUrl.pathname = '/school-unavailable';
          rewriteUrl.search = '';
          return NextResponse.rewrite(rewriteUrl);
        }
      }
    } catch {
      // If tenant lookup is unreachable, continue — do not block the whole app.
    }
  }

  if (!isApiRoute) {
    for (const [from, to] of ACADEMIC_ROUTE_REDIRECTS) {
      if (pathname === from) {
        const url = request.nextUrl.clone();
        url.pathname = to;
        return NextResponse.redirect(url);
      }
    }

    if (pathname === '/fees') {
      const tab = request.nextUrl.searchParams.get('tab');
      const url = request.nextUrl.clone();
      url.pathname = tab && FEE_TAB_REDIRECTS[tab] ? FEE_TAB_REDIRECTS[tab] : '/fees/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  if (isApiRoute) {
    if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (SUPER_ADMIN_API_PATHS.some((p) => pathname.startsWith(p))) {
      const role = getRoleFromToken(token);
      if (role !== 'super_admin') {
        return NextResponse.json(
          { success: false, error: 'Super admin access required' },
          { status: 403 }
        );
      }
    }

    return NextResponse.next();
  }

  if (!token && !isPublicPage && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!isApiRoute && subdomain && pathname === '/' && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|shribi-smart-school-logo.png|dashboard-shribi.png|edulakhya-logo.png|uploads/).*)',
  ],
};
