export interface LookupListConfig {
  items: string[];
  default_value: string;
}

export interface StudentLookupSettings {
  nationalities: LookupListConfig;
  religions: LookupListConfig;
  caste_types: LookupListConfig;
}

export const STUDENT_LOOKUP_KEYS = ['nationalities', 'religions', 'caste_types'] as const;

export type StudentLookupKey = (typeof STUDENT_LOOKUP_KEYS)[number];

export const DEFAULT_STUDENT_LOOKUP_SETTINGS: StudentLookupSettings = {
  nationalities: {
    items: ['Indian'],
    default_value: 'Indian',
  },
  religions: {
    items: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'],
    default_value: 'Hindu',
  },
  caste_types: {
    items: ['GEN', 'OBC', 'SC', 'ST', 'SC/ST', 'EWS', 'Other'],
    default_value: 'GEN',
  },
};

export const STUDENT_LOOKUP_LABELS: Record<StudentLookupKey, { title: string; description: string; placeholder: string }> = {
  nationalities: {
    title: 'Nationality',
    description: 'Used on student admission and profile. Default is Indian.',
    placeholder: 'Add nationality (e.g. Nepalese)',
  },
  religions: {
    title: 'Religion',
    description: 'Used on student admission and profile. Default is Hindu.',
    placeholder: 'Add religion',
  },
  caste_types: {
    title: 'Caste Type',
    description: 'Reservation category shown as Caste Type on student forms.',
    placeholder: 'Add caste type (e.g. GEN, OBC)',
  },
};

const MAX_ITEM_LENGTH = 100;

function uniqueTrimmedItems(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const item = value.trim();
    if (!item || item.length > MAX_ITEM_LENGTH) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

function mergeLookupList(raw: unknown, fallback: LookupListConfig): LookupListConfig {
  const input = raw && typeof raw === 'object' ? (raw as Partial<LookupListConfig>) : {};
  const items = uniqueTrimmedItems(input.items);
  const resolvedItems = items.length > 0 ? items : [...fallback.items];
  const requestedDefault =
    typeof input.default_value === 'string' ? input.default_value.trim() : '';
  const default_value = resolvedItems.includes(requestedDefault)
    ? requestedDefault
    : resolvedItems.includes(fallback.default_value)
      ? fallback.default_value
      : resolvedItems[0] || '';
  return { items: resolvedItems, default_value };
}

export function mergeStudentLookupSettings(raw: unknown): StudentLookupSettings {
  const input = raw && typeof raw === 'object' ? (raw as Partial<StudentLookupSettings>) : {};
  return {
    nationalities: mergeLookupList(input.nationalities, DEFAULT_STUDENT_LOOKUP_SETTINGS.nationalities),
    religions: mergeLookupList(input.religions, DEFAULT_STUDENT_LOOKUP_SETTINGS.religions),
    caste_types: mergeLookupList(input.caste_types, DEFAULT_STUDENT_LOOKUP_SETTINGS.caste_types),
  };
}

export function withCurrentLookupValue(items: string[], current?: string | null): string[] {
  const value = current?.trim();
  if (!value || items.some((item) => item.toLowerCase() === value.toLowerCase())) {
    return items;
  }
  return [...items, value];
}

export const STUDENT_LOOKUP_SETTINGS_MIGRATION_SQL = `
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS student_lookup_settings JSONB DEFAULT '{}'::jsonb;
`;
