export const AUTH_COOKIE_NAME = 'token';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function getServerAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
    sameSite: 'lax' as const,
    httpOnly: false,
    secure: isProduction,
  };
}

export function writeClientAuthCookie(token: string): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

export function clearClientAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
