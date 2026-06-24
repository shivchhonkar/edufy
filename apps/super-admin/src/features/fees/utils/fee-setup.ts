import type { Class } from '@/shared/types';

export const SETUP_FEE_COLUMNS = [
  { key: 'tuition', label: 'Tuition', fee_type: 'Tuition Fee', frequency: 'monthly', defaultAmount: 3500 },
  { key: 'library', label: 'Library', fee_type: 'Library Fee', frequency: 'yearly', defaultAmount: 200 },
  { key: 'laboratory', label: 'Laboratory', fee_type: 'Laboratory Fee', frequency: 'yearly', defaultAmount: 500 },
  { key: 'sports', label: 'Sports', fee_type: 'Sports Fee', frequency: 'yearly', defaultAmount: 300 },
  { key: 'examination', label: 'Examination', fee_type: 'Examination Fee', frequency: 'yearly', defaultAmount: 100 },
  { key: 'activity', label: 'Activity', fee_type: 'Activity Fee', frequency: 'monthly', defaultAmount: 150 },
] as const;

export type FeeColumnKey = (typeof SETUP_FEE_COLUMNS)[number]['key'];

export type FeeCell = { amount: string; structureId?: number };

export type ClassFeeRow = {
  classId: number;
  className: string;
  fees: Record<FeeColumnKey, FeeCell>;
};

export function defaultTuitionForClass(className: string): number {
  if (/class\s*[1-3]|^1$|^2$|^3$/i.test(className) || /\b(1|2|3)\b/.test(className)) return 3000;
  if (/class\s*[4-6]|^4$|^5$|^6$/i.test(className) || /\b(4|5|6)\b/.test(className)) return 3500;
  if (/class\s*[7-9]|^7$|^8$|^9$/i.test(className) || /\b(7|8|9)\b/.test(className)) return 4000;
  return 4500;
}

export function buildEmptyFeeRow(cls: Class): ClassFeeRow {
  const fees = {} as Record<FeeColumnKey, FeeCell>;
  for (const col of SETUP_FEE_COLUMNS) {
    const amount =
      col.key === 'tuition'
        ? String(defaultTuitionForClass(cls.name))
        : String(col.defaultAmount);
    fees[col.key] = { amount };
  }
  return { classId: cls.id, className: cls.name, fees };
}
