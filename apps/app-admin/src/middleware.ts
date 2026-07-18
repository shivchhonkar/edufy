import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];
const PUBLIC_API_PATHS = ['/api/auth/login'];

function getToken(request: NextRequest): string | null {
  return request.cookies.get('token')?.value || null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = getToken(request);
  const isApi = pathname.startsWith('/api');
  const isPublicPage = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isPublicApi = PUBLIC_API_PATHS.some((path) => pathname.startsWith(path));

  if (isApi) {
    if (isPublicApi) return NextResponse.next();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!token && !isPublicPage && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (token && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (!token && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
