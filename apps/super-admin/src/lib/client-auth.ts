/** Read auth token from cookie (source of truth for middleware + API) */
export function getClientToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
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
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
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
  document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`;
}
