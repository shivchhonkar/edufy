/** Read auth token from cookie (source of truth for middleware + API) */
export function getClientToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const SCHOOL_SWITCHED_EVENT = 'edufy:school-switched';
export const SCHOOLS_LIST_UPDATED_EVENT = 'edufy:schools-list-updated';

/** Active school id from JWT (source of truth after switch-school). */
export function getActiveSchoolId(): number | null {
  const token = getClientToken();
  if (!token) {
    const user = getClientUser();
    const fromUser = user?.school_id ?? user?.tenant_id;
    return fromUser != null && Number.isFinite(Number(fromUser)) ? Number(fromUser) : null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as {
      school_id?: number;
      tenant_id?: number;
    };
    const id = payload.school_id ?? payload.tenant_id;
    return id != null && Number.isFinite(Number(id)) ? Number(id) : null;
  } catch {
    return null;
  }
}

export function notifySchoolSwitched(schoolId: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(SCHOOL_SWITCHED_EVENT, { detail: { schoolId } }),
  );
}

export function notifySchoolsListUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SCHOOLS_LIST_UPDATED_EVENT));
}

/** Edge-safe JWT payload decode for client-side role resolution */
function getRoleFromClientToken(): string | null {
  const token = getClientToken();
  if (!token) return null;

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

/** Sync localStorage user from cookie-backed session */
export function getClientUser(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as Record<string, unknown>;
    const storedRole = user.role;
    if (storedRole == null || String(storedRole).trim() === '') {
      const tokenRole = getRoleFromClientToken();
      if (tokenRole) user.role = tokenRole;
    }
    return user;
  } catch {
    return null;
  }
}

/** Resolve role from stored user or JWT (handles older sessions missing role in localStorage). */
export function getClientUserRole(): string | null {
  const user = getClientUser();
  const role = user?.role;
  if (role != null && String(role).trim() !== '') {
    return String(role);
  }
  return getRoleFromClientToken();
}

export function isClientAuthenticated(): boolean {
  return !!getClientToken();
}

export function isAdminRole(role: unknown): boolean {
  const normalized = String(role || '').toLowerCase().replace(/\s+/g, '_');
  return (
    normalized === 'super_admin' ||
    normalized === 'admin' ||
    normalized === 'administrator' ||
    normalized === 'superadmin'
  );
}

export function clearClientSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  clearClientAuthCookie();
}

import { getRoleHomePath } from './role-routing';
import { clearClientAuthCookie, writeClientAuthCookie } from './auth-cookie';

export function getClientRoleHomePath(): string {
  return getRoleHomePath(getClientUserRole());
}

export function setClientSession(token: string, user: Record<string, unknown>): void {
  const sessionUser = { ...user };
  if (sessionUser.role == null || String(sessionUser.role).trim() === '') {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64)) as { role?: string };
        if (payload.role) sessionUser.role = payload.role;
      }
    } catch {
      // keep user as-is
    }
  }

  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(sessionUser));
  writeClientAuthCookie(token);
}
