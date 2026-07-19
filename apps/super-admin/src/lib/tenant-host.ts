/** Host/subdomain helpers — safe for Edge middleware (no DB imports). */

function normalizeHostname(host: string | null): string | null {
  if (!host) return null;
  return host.split(':')[0].toLowerCase();
}

/** Platform apex domain, e.g. edufy.shribi.com (no protocol or port). */
function getAppBaseDomain(): string | null {
  const fromEnv =
    process.env.APP_BASE_DOMAIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_BASE_DOMAIN?.trim();
  if (!fromEnv) return null;
  return fromEnv.replace(/^https?:\/\//, '').split(':')[0].toLowerCase();
}

function isPlatformApex(hostname: string, baseDomain: string): boolean {
  return hostname === baseDomain || hostname === `www.${baseDomain}`;
}

/**
 * Extract school/org subdomain from host.
 * - localhost → null (platform)
 * - global.localhost → global
 * - edufy.shribi.com → null when APP_BASE_DOMAIN=edufy.shribi.com
 * - global.edufy.shribi.com → global
 */
export function extractSubdomain(host: string | null): string | null {
  const hostname = normalizeHostname(host);
  if (!hostname) return null;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  const parts = hostname.split('.');

  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    return parts[0] || null;
  }

  const baseDomain = getAppBaseDomain();
  if (baseDomain) {
    if (isPlatformApex(hostname, baseDomain)) {
      return null;
    }

    const suffix = `.${baseDomain}`;
    if (hostname.endsWith(suffix)) {
      const label = hostname.slice(0, -suffix.length);
      if (!label || label.includes('.')) return null;
      if (label === 'www') return null;
      return label;
    }

    return null;
  }

  // Fallback when APP_BASE_DOMAIN is unset (simple 3-label hosts only).
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
