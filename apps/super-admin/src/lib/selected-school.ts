const STORAGE_PREFIX = 'edufy:lastSchool:';

export type PublicSchoolOption = {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  is_primary?: boolean;
};

export function getLastSelectedSchoolId(orgSlug: string): number | null {
  if (typeof window === 'undefined' || !orgSlug) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${orgSlug}`);
    if (!raw) return null;
    const id = parseInt(raw, 10);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export function setLastSelectedSchoolId(orgSlug: string, schoolId: number): void {
  if (typeof window === 'undefined' || !orgSlug || !Number.isFinite(schoolId)) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${orgSlug}`, String(schoolId));
  } catch {
    // ignore quota / private mode
  }
}

export function clearLastSelectedSchoolId(orgSlug: string): void {
  if (typeof window === 'undefined' || !orgSlug) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${orgSlug}`);
  } catch {
    // ignore
  }
}

export function resolveInitialSchoolSelection(
  orgSlug: string,
  schools: PublicSchoolOption[],
): { step: 'select-school' | 'login'; school: PublicSchoolOption | null } {
  if (schools.length === 0) {
    return { step: 'select-school', school: null };
  }

  if (schools.length === 1) {
    return { step: 'login', school: schools[0] };
  }

  const lastId = getLastSelectedSchoolId(orgSlug);
  const remembered = lastId ? schools.find((s) => s.id === lastId) ?? null : null;
  if (remembered) {
    return { step: 'login', school: remembered };
  }

  return { step: 'select-school', school: null };
}
