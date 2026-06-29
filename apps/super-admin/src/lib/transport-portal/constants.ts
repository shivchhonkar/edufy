export const TRANSPORT_PORTAL_BASE = '/transport';
export const TRANSPORT_API_BASE = '/api/transport';

export function transportRoute(path = ''): string {
  if (!path || path === '/') return `${TRANSPORT_PORTAL_BASE}/dashboard`;
  return `${TRANSPORT_PORTAL_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function transportApi(path: string): string {
  return `${TRANSPORT_API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
