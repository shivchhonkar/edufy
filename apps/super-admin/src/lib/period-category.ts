export const PERIOD_CATEGORIES = ['study', 'lunch', 'activity'] as const;

export type PeriodCategory = (typeof PERIOD_CATEGORIES)[number];

export const DEFAULT_PERIOD_CATEGORY: PeriodCategory = 'study';

export function normalizePeriodCategory(value?: string | null): PeriodCategory {
  if (value === 'lunch' || value === 'activity') return value;
  return DEFAULT_PERIOD_CATEGORY;
}

export function categorySchedulingMeta(category: PeriodCategory) {
  switch (category) {
    case 'lunch':
      return { is_schedulable: false, slot_type: 'lunch' as const };
    case 'activity':
      return { is_schedulable: true, slot_type: 'period' as const };
    default:
      return { is_schedulable: true, slot_type: 'period' as const };
  }
}

export function resolvePeriodCategory(period: {
  period_category?: string | null;
  slot_type?: string | null;
  is_schedulable?: boolean | null;
}): PeriodCategory {
  if (period.period_category) {
    return normalizePeriodCategory(period.period_category);
  }
  if (period.slot_type === 'lunch' || period.slot_type === 'break' || period.is_schedulable === false) {
    return 'lunch';
  }
  return DEFAULT_PERIOD_CATEGORY;
}

export function categoryLabel(category: PeriodCategory) {
  switch (category) {
    case 'lunch':
      return 'Lunch';
    case 'activity':
      return 'Activity';
    default:
      return 'Study';
  }
}

export function categoryBadgeClass(category: PeriodCategory) {
  switch (category) {
    case 'lunch':
      return 'bg-amber-100 text-amber-800';
    case 'activity':
      return 'bg-violet-100 text-violet-800';
    default:
      return 'bg-green-100 text-green-800';
  }
}
