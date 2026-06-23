/**
 * Academic year utilities for the fees module.
 *
 * Storage rule: `student_fees.month` is always a **calendar month** (January = 1 … December = 12).
 * Academic ordering (April → March) is computed here — never stored as month numbers.
 */

import { calculateDueDate } from '@/lib/fees/FeeDateService';

export const CALENDAR_MONTH_MIN = 1;
export const CALENDAR_MONTH_MAX = 12;

/** Calendar months in Indian school session order (April → March). */
export const ACADEMIC_MONTH_SEQUENCE: readonly number[] = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

/** Display names aligned with {@link ACADEMIC_MONTH_SEQUENCE}. */
export const ACADEMIC_MONTH_SEQUENCE_NAMES: readonly string[] = [
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
];

export type ParsedAcademicYear = {
  /** Normalized label, e.g. `2025-26` */
  name: string;
  startYear: number;
  endYear: number;
  startDate: string;
  endDate: string;
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function parseYearToken(token: string, fallbackCentury = 2000): number | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  if (Number.isNaN(n)) return null;
  if (trimmed.length <= 2) return fallbackCentury + n;
  return n;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Parse academic year strings such as `2025-26`, `2025-2026`, or `2025`. */
export function parseAcademicYear(input: string): ParsedAcademicYear {
  const raw = String(input ?? '').trim();
  if (!raw) {
    throw new Error('Academic year is required');
  }

  const parts = raw.split('-').map((p) => p.trim()).filter(Boolean);
  const startYear = parseYearToken(parts[0] ?? '');
  if (startYear == null) {
    throw new Error(`Invalid academic year: ${input}`);
  }

  let endYear: number;
  if (parts.length >= 2) {
    const endToken = parts[1];
    const parsedEnd = parseYearToken(endToken, Math.floor(startYear / 100) * 100);
    if (parsedEnd == null) {
      endYear = startYear + 1;
    } else if (endToken.length <= 2) {
      endYear = Math.floor(startYear / 100) * 100 + parsedEnd;
      if (endYear <= startYear) endYear += 100;
    } else {
      endYear = parsedEnd;
    }
  } else {
    endYear = startYear + 1;
  }

  const name = `${startYear}-${pad2(endYear % 100)}`;

  return {
    name,
    startYear,
    endYear,
    startDate: isoDate(startYear, 4, 1),
    endDate: isoDate(endYear, 3, 31),
  };
}

/** Returns true when the string can be parsed as an academic year. */
export function validateAcademicYear(input: string): boolean {
  try {
    parseAcademicYear(input);
    return true;
  } catch {
    return false;
  }
}

/** Normalized academic year label (`2025-26`). */
export function normalizeAcademicYear(input: string): string {
  return parseAcademicYear(input).name;
}

/** SQL / lookup variants for legacy stored academic year formats. */
export function academicYearVariants(academicYear: string): string[] {
  const parsed = parseAcademicYear(academicYear);
  return [parsed.name, `${parsed.startYear}-${parsed.endYear}`, String(parsed.startYear)];
}

/** True when two academic year labels refer to the same session (e.g. `2026-27` vs `2026-2027`). */
export function academicYearMatches(
  stored: string | null | undefined,
  target: string | null | undefined,
): boolean {
  if (!stored || !target) return false;
  if (stored === target) return true;
  try {
    const storedSet = new Set(academicYearVariants(normalizeAcademicYear(stored)));
    for (const variant of academicYearVariants(normalizeAcademicYear(target))) {
      if (storedSet.has(variant)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Distinct DB values to match for one academic session. */
export function academicYearFilterValues(academicYear: string): string[] {
  return [...new Set(academicYearVariants(normalizeAcademicYear(academicYear)))];
}

/** All calendar months in academic session order. */
export function getAcademicSequence(): readonly number[] {
  return ACADEMIC_MONTH_SEQUENCE;
}

/**
 * Academic position within the session (April = 1 … March = 12).
 * Use for ordering only — not for DB storage.
 */
export function calendarMonthToSequenceIndex(calendarMonth: number): number {
  assertCalendarMonth(calendarMonth);
  const idx = ACADEMIC_MONTH_SEQUENCE.indexOf(calendarMonth);
  if (idx === -1) throw new Error(`Invalid calendar month: ${calendarMonth}`);
  return idx + 1;
}

/** Convert academic sequence position (1–12) to calendar month (1–12). */
export function sequenceIndexToCalendarMonth(sequenceIndex: number): number {
  if (sequenceIndex < 1 || sequenceIndex > 12) {
    throw new Error(`Academic sequence index must be 1–12, got ${sequenceIndex}`);
  }
  return ACADEMIC_MONTH_SEQUENCE[sequenceIndex - 1];
}

/** Compare two calendar months within April → March ordering. */
export function compareCalendarMonthsInAcademicOrder(a: number, b: number): number {
  return calendarMonthToSequenceIndex(a) - calendarMonthToSequenceIndex(b);
}

/** True when `month` occurs on or before `throughMonth` in the academic session. */
export function isCalendarMonthOnOrBefore(month: number, throughMonth: number): boolean {
  return compareCalendarMonthsInAcademicOrder(month, throughMonth) <= 0;
}

export function getCurrentCalendarMonth(asOf: Date = new Date()): number {
  return asOf.getMonth() + 1;
}

/** Calendar year for a calendar month inside the parsed academic year. */
export function calendarYearForMonth(parsed: ParsedAcademicYear, calendarMonth: number): number {
  assertCalendarMonth(calendarMonth);
  return calendarMonth >= 4 ? parsed.startYear : parsed.endYear;
}

/** Due date (10th) for a calendar month within an academic year. @deprecated Use FeeDateService.calculateDueDate */
export function dueDateForMonth(academicYear: string, calendarMonth: number, dueDay = 10): string {
  return calculateDueDate({ academicYear, calendarMonth, dueDay });
}

/** Calendar months that receive fee rows for a structure frequency. Values are always 1–12. */
export function getPeriodCalendarMonths(frequency: string): number[] {
  const seq = [...ACADEMIC_MONTH_SEQUENCE];
  switch (frequency) {
    case 'monthly':
      return seq;
    case 'quarterly':
      return [seq[0], seq[3], seq[6], seq[9]];
    case 'half_yearly':
      return [seq[0], seq[6]];
    case 'yearly':
    case 'one_time':
      return [seq[0]];
    default:
      return seq;
  }
}

export function getCalendarMonthName(calendarMonth: number): string {
  assertCalendarMonth(calendarMonth);
  return MONTH_NAMES[calendarMonth - 1];
}

export function getCalendarMonthShortName(calendarMonth: number): string {
  assertCalendarMonth(calendarMonth);
  return SHORT_MONTH_NAMES[calendarMonth - 1];
}

/** Name for a month in academic session order at `sequenceIndex` (1-based). */
export function getAcademicSequenceMonthName(sequenceIndex: number): string {
  return ACADEMIC_MONTH_SEQUENCE_NAMES[sequenceIndex - 1] ?? 'Unknown';
}

/** SQL fragment: months from session start through the current calendar month. */
export function buildOverdueMonthSqlCondition(column = 'sf.month', asOf: Date = new Date()): string {
  const currentMonth = getCurrentCalendarMonth(asOf);
  if (currentMonth >= 4) {
    return `${column} BETWEEN 4 AND ${currentMonth}`;
  }
  return `(${column} BETWEEN 4 AND 12 OR ${column} BETWEEN 1 AND ${currentMonth})`;
}

/** Default session for “today” (April → March). */
export function getDefaultAcademicYearForDate(asOf: Date = new Date()): ParsedAcademicYear {
  const year = asOf.getFullYear();
  const month = getCurrentCalendarMonth(asOf);
  const startYear = month >= 4 ? year : year - 1;
  return parseAcademicYear(`${startYear}-${pad2((startYear + 1) % 100)}`);
}

function assertCalendarMonth(calendarMonth: number): void {
  if (
    !Number.isInteger(calendarMonth) ||
    calendarMonth < CALENDAR_MONTH_MIN ||
    calendarMonth > CALENDAR_MONTH_MAX
  ) {
    throw new Error(`Calendar month must be ${CALENDAR_MONTH_MIN}–${CALENDAR_MONTH_MAX}, got ${calendarMonth}`);
  }
}

/** @deprecated Use {@link dueDateForMonth} with calendar months. */
export function dueDateForAcademicMonth(academicYearStart: Date, sequenceIndex: number): string {
  const calendarMonth = sequenceIndexToCalendarMonth(sequenceIndex);
  const startYear = academicYearStart.getFullYear();
  const year = calendarMonth >= 4 ? startYear : startYear + 1;
  return isoDate(year, calendarMonth, 10);
}

/** @deprecated Use {@link parseAcademicYear} and {@link dueDateForMonth}. */
export function parseAcademicYearStart(academicYear: string): Date {
  const parsed = parseAcademicYear(academicYear);
  return new Date(parsed.startDate);
}
