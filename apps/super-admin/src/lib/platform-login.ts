/** Client-side helpers for unified platform login (no subdomain). */

export function getClientSubdomain(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;

  const parts = hostname.split('.');
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    return parts[0] || null;
  }
  if (parts.length >= 3) {
    return parts[0] || null;
  }
  return null;
}

/** True when login must start with a school code (plain platform host). */
export function isPlatformLoginHost(): boolean {
  return getClientSubdomain() === null;
}
