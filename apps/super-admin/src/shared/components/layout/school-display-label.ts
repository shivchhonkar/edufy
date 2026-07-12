import { getClientUser } from '@/lib/client-auth';
import type { useSchoolSwitchSession } from '@/hooks/use-school-switch-session';

export function resolveSchoolDisplayLabel(
  schoolName: string,
  session: ReturnType<typeof useSchoolSwitchSession>['session'],
): string {
  const trimmedName = schoolName.trim();
  if (trimmedName && trimmedName !== 'School CRM' && trimmedName !== 'School') {
    return trimmedName;
  }

  const user = getClientUser();
  const slug =
    session?.activeSchool?.slug ??
    (user?.school_slug != null
      ? String(user.school_slug)
      : user?.tenant_slug != null
        ? String(user.tenant_slug)
        : '');

  return slug || trimmedName || 'School';
}
