import type { PortalId } from '@/lib/role-routing';
import { PORTAL_TITLES } from '@/shared/navigation/portal-navigation';
import { studentFullName } from '@/lib/parent-portal/client-auth';

type PortalChild = {
  id?: number;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string | null;
};

export function formatPortalRole(role: string | null | undefined): string {
  if (!role) return 'User';
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getPortalUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function resolvePortalDisplayName(
  user: Record<string, unknown> | null,
  role: string | null | undefined,
  selectedChildId?: string | null,
): string {
  if (!user) return 'User';

  const fullName = String(user.full_name || '').trim();
  if (fullName) return fullName;

  const normalizedRole = String(role || user.role || '').toLowerCase();

  if (normalizedRole === 'parent') {
    const login = String(user.login || user.email || '').trim();
    if (login && !/^\d+$/.test(login.replace(/\s/g, ''))) {
      return login;
    }

    const children = (user.children as PortalChild[] | undefined) || [];
    const preferredId = selectedChildId || null;
    const child =
      (preferredId
        ? children.find((item) => String(item.id) === preferredId)
        : null) || children[0];

    if (child?.first_name) {
      return `Parent — ${studentFullName(child as Parameters<typeof studentFullName>[0])}`;
    }

    return 'Parent';
  }

  const email = String(user.email || '').trim();
  if (email.includes('@')) return email.split('@')[0];

  return PORTAL_TITLES[normalizedRole as PortalId] || formatPortalRole(normalizedRole);
}

export function formatPortalHeaderDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
