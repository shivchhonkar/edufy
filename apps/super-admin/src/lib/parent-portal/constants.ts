export const PARENT_PORTAL_BASE = '/parent';
export const PARENT_API_BASE = '/api/parent';

export function parentRoute(path = ''): string {
  if (!path || path === '/') return PARENT_PORTAL_BASE;
  return `${PARENT_PORTAL_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function parentApi(path: string): string {
  return `${PARENT_API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
