/** Client-side helpers for unified platform login (no subdomain). */

import { extractSubdomain } from '@/lib/tenant-host';

export function getClientSubdomain(): string | null {
  if (typeof window === 'undefined') return null;
  return extractSubdomain(window.location.host);
}

/** True when login must start with a school code (plain platform host). */
export function isPlatformLoginHost(): boolean {
  return getClientSubdomain() === null;
}
