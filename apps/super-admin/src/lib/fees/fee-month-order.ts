import {
  calendarMonthToSequenceIndex,
  calendarYearForMonth,
  parseAcademicYear,
} from '@/lib/fees/AcademicYear';

export type MonthYearEntry = { month: number; year?: number };

export function resolveMonthCalendarYear(
  month: number,
  academicYear?: string,
  explicitYear?: number | null,
): number {
  if (
    explicitYear != null &&
    Number.isFinite(explicitYear) &&
    explicitYear >= 2000 &&
    explicitYear <= 2100
  ) {
    return explicitYear;
  }

  if (academicYear) {
    try {
      return calendarYearForMonth(parseAcademicYear(academicYear), month);
    } catch {
      /* fall through */
    }
  }

  return new Date().getFullYear();
}

/** April → March session order (matches Select Months to Pay grid). */
export function sortMonthsInAcademicOrder(
  months: MonthYearEntry[],
  academicYear?: string,
): MonthYearEntry[] {
  return [...months].sort((a, b) => {
    const seq = calendarMonthToSequenceIndex(a.month) - calendarMonthToSequenceIndex(b.month);
    if (seq !== 0) return seq;
    const yearA = a.year ?? resolveMonthCalendarYear(a.month, academicYear);
    const yearB = b.year ?? resolveMonthCalendarYear(b.month, academicYear);
    return yearA - yearB;
  });
}

export function sortCalendarMonthNumbers(months: number[]): number[] {
  return [...months].sort(
    (a, b) => calendarMonthToSequenceIndex(a) - calendarMonthToSequenceIndex(b),
  );
}

export function uniqueMonthsInAcademicOrder(
  fees: Array<{ month?: number | string | null }>,
): number[] {
  const months = fees
    .map((fee) => parseInt(String(fee.month), 10))
    .filter((month) => Number.isFinite(month) && month >= 1 && month <= 12);

  return sortCalendarMonthNumbers([...new Set(months)]);
}

export function monthLongName(month: number): string {
  return new Date(2024, month - 1).toLocaleString('en-IN', { month: 'long' });
}
