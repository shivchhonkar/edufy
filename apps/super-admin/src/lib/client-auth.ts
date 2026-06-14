/** Read auth token from cookie (source of truth for middleware + API) */
export function getClientToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Sync localStorage user from cookie-backed session */
export function getClientUser(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isClientAuthenticated(): boolean {
  return !!getClientToken();
}

export function clearClientSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function setClientSession(token: string, user: Record<string, unknown>): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`;
}
