export const AUTH_COOKIE_NAME = 'token';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Cookie Domain attribute for Set-Cookie / document.cookie.
 * On local dev (*.localhost) we omit Domain so the cookie is host-only — this avoids
 * Set-Cookie issues in some browsers/Next.js builds and still works with client session.
 */
export function resolveAuthCookieDomain(host?: string | null): string | undefined {
  const hostname = (host ?? '').split(':')[0].toLowerCase();
  if (!hostname) return undefined;

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return undefined;
  }

  const explicit =
    process.env.APP_COOKIE_DOMAIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_COOKIE_DOMAIN?.trim();
  if (explicit) {
    return explicit.startsWith('.') ? explicit : `.${explicit}`;
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return `.${parts.slice(-2).join('.')}`;
  }

  return undefined;
}

export function getServerAuthCookieOptions(requestHost: string | null | undefined) {
  const domain = resolveAuthCookieDomain(requestHost);
  return {
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
    sameSite: 'lax' as const,
    ...(domain ? { domain } : {}),
  };
}

export function writeClientAuthCookie(token: string, host?: string | null): void {
  if (typeof document === 'undefined') return;

  const domain = resolveAuthCookieDomain(host ?? window.location.host);
  const domainPart = domain ? `; domain=${domain}` : '';
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax${domainPart}`;
}

export function clearClientAuthCookie(host?: string | null): void {
  if (typeof document === 'undefined') return;

  const domain = resolveAuthCookieDomain(host ?? window.location.host);
  const domainPart = domain ? `; domain=${domain}` : '';
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${domainPart}`;
}
