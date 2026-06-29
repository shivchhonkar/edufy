export const TEACHER_PORTAL_BASE = '/teacher';
export const TEACHER_API_BASE = '/api/teacher';

export function teacherRoute(path = ''): string {
  if (!path || path === '/') return TEACHER_PORTAL_BASE;
  return `${TEACHER_PORTAL_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function teacherApi(path: string): string {
  return `${TEACHER_API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
