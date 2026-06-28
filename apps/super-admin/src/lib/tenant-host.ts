/** Host/subdomain helpers — safe for Edge middleware (no DB imports). */

/** Extract school subdomain from host (e.g. global.localhost → global) */
export function extractSubdomain(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0].toLowerCase();

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  const parts = hostname.split('.');

  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    return parts[0] || null;
  }

  if (parts.length >= 3) {
    return parts[0] || null;
  }

  return null;
}

/** Paths that skip tenant-exists validation (avoid loops / platform routes). */
export const TENANT_CHECK_SKIP_PREFIXES = [
  '/school-unavailable',
  '/api/tenant/check',
  '/_next',
  '/favicon.ico',
];

export function shouldValidateTenant(pathname: string): boolean {
  return !TENANT_CHECK_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
