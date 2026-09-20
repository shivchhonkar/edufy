import type { Class } from '@/shared/types';

export type ClassCategoryKey =
  | 'all'
  | 'pre-primary'
  | 'primary'
  | 'middle'
  | 'secondary'
  | 'senior'
  | 'other';

export const CLASS_CATEGORY_LABELS: Record<Exclude<ClassCategoryKey, 'all'>, string> = {
  'pre-primary': 'Pre Primary',
  primary: 'Primary',
  middle: 'Middle',
  secondary: 'Secondary',
  senior: 'Senior',
  other: 'Other',
};

export function inferClassCategory(className: string): Exclude<ClassCategoryKey, 'all'> {
  const n = className.toLowerCase().trim();
  if (/nursery|play\s*group|pre\s*primary|lkg|ukg|kg/.test(n)) return 'pre-primary';
  const numMatch = n.match(/(?:class\s*)?(\d{1,2})/);
  const num = numMatch ? parseInt(numMatch[1], 10) : NaN;
  if (num >= 11 && num <= 12) return 'senior';
  if (num >= 9 && num <= 10) return 'secondary';
  if (num >= 6 && num <= 8) return 'middle';
  if (num >= 1 && num <= 5) return 'primary';
  if (/xi\b|xii\b|\b11\b|\b12\b/.test(n)) return 'senior';
  if (/\b9\b|\b10\b|\bix\b|\bx\b/.test(n)) return 'secondary';
  if (/\b[6-8]\b/.test(n)) return 'middle';
  if (/\b[1-5]\b/.test(n)) return 'primary';
  return 'other';
}

export function filterClassesByCategory(
  classes: Class[],
  category: ClassCategoryKey,
  search: string,
): Class[] {
  const q = search.trim().toLowerCase();
  return classes.filter((cls) => {
    if (category !== 'all' && inferClassCategory(cls.name) !== category) return false;
    if (q && !cls.name.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function countByCategory(classes: Class[]): Record<ClassCategoryKey, number> {
  const counts: Record<ClassCategoryKey, number> = {
    all: classes.length,
    'pre-primary': 0,
    primary: 0,
    middle: 0,
    secondary: 0,
    senior: 0,
    other: 0,
  };
  for (const cls of classes) {
    counts[inferClassCategory(cls.name)] += 1;
  }
  return counts;
}
