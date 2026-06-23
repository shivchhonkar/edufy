import { calendarYearForMonth, parseAcademicYear } from '@/lib/fees/AcademicYear';
import { DEFAULT_DUE_DAY } from '@/lib/fees/constants';

export type CalculateDueDateOptions = {
  academicYear: string;
  /** Calendar month 1–12 (January = 1). */
  calendarMonth: number;
  dueDay?: number;
};

/**
 * Single source of truth for fee due dates.
 * Always uses calendar months; academic year determines the calendar year.
 */
export function calculateDueDate(options: CalculateDueDateOptions): string {
  const { academicYear, calendarMonth, dueDay = DEFAULT_DUE_DAY } = options;

  if (!Number.isInteger(calendarMonth) || calendarMonth < 1 || calendarMonth > 12) {
    throw new Error(`calendarMonth must be 1–12, got ${calendarMonth}`);
  }

  const parsed = parseAcademicYear(academicYear);
  const year = calendarYearForMonth(parsed, calendarMonth);
  const day = Math.min(Math.max(dueDay, 1), 28);

  return `${year}-${String(calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** @deprecated Use {@link calculateDueDate}. */
export function dueDateForMonth(
  academicYear: string,
  calendarMonth: number,
  dueDay = DEFAULT_DUE_DAY
): string {
  return calculateDueDate({ academicYear, calendarMonth, dueDay });
}
