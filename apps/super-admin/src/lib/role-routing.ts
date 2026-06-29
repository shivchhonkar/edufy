export type PortalId = 'admin' | 'teacher' | 'parent' | 'transport';

export const PORTAL_HOME: Record<PortalId, string> = {
  admin: '/admin',
  teacher: '/teacher',
  parent: '/parent',
  transport: '/transport',
};

const ADMIN_ROLES = new Set([
  'super_admin',
  'admin',
  'administrator',
  'superadmin',
  'inventory_manager',
]);

/** Path prefixes each portal role may access (admin may access everything). */
export const PORTAL_ALLOWED_PREFIXES: Record<Exclude<PortalId, 'admin'>, string[]> = {
  teacher: ['/teacher'],
  parent: ['/parent'],
  transport: ['/transport'],
};

export function normalizeRole(role: string | null | undefined): string {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.has(normalizeRole(role));
}

export function getPortalForRole(role: string | null | undefined): PortalId {
  const r = normalizeRole(role);
  if (ADMIN_ROLES.has(r)) return 'admin';
  if (r === 'teacher') return 'teacher';
  if (r === 'parent') return 'parent';
  if (r === 'transport_manager') return 'transport';
  return 'admin';
}

export function getRoleHomePath(role: string | null | undefined): string {
  return PORTAL_HOME[getPortalForRole(role)];
}

export function getPortalFromPath(pathname: string): PortalId | null {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  if (pathname === '/teacher' || pathname.startsWith('/teacher/')) return 'teacher';
  if (pathname === '/parent' || pathname.startsWith('/parent/')) return 'parent';
  if (pathname === '/transport' || pathname.startsWith('/transport/')) return 'transport';
  return null;
}

/** Legacy super-admin routes that only admin roles may use. */
const LEGACY_ADMIN_PREFIXES = [
  '/admin',
  '/dashboard',
  '/students',
  '/fees',
  '/settings',
  '/admissions',
  '/hr',
  '/academics',
  '/exams',
  '/attendance',
  '/homework',
  '/ess',
  '/communications',
  '/inventory',
  '/library',
  '/accounting',
  '/promotions',
  '/report-cards',
  '/staff',
  '/event-calendar',
  '/visitor-management',
  '/teachers',
  '/transport',
  '/setup',
  '/fix-exams',
  '/test-migration',
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canRoleAccessPath(role: string | null | undefined, pathname: string): boolean {
  if (isAdminRole(role)) return true;

  const portal = getPortalForRole(role);
  const allowed = PORTAL_ALLOWED_PREFIXES[portal];
  if (allowed.some((prefix) => matchesPrefix(pathname, prefix))) {
    return true;
  }

  if (LEGACY_ADMIN_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return false;
  }

  const pathPortal = getPortalFromPath(pathname);
  if (pathPortal && pathPortal !== portal) {
    return false;
  }

  return pathname === '/' || pathname === '/login';
}

export function decodeJwtRole(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}
