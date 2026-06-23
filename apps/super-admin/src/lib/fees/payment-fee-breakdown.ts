import {
  calendarMonthToSequenceIndex,
  calendarYearForMonth,
  parseAcademicYear,
} from '@/lib/fees/AcademicYear';
import { resolveMonthCalendarYear } from '@/lib/fees/fee-month-order';

export type StoredFeeBreakdownItem = {
  fee_type: string;
  month: number | string;
  year?: number | string;
  amount: number;
  late_fee?: number;
};

/** Parse fee_breakdown from DB (JSONB object or string). */
export function parseStoredFeeBreakdown(raw: unknown): StoredFeeBreakdownItem[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        fee_type: String(item.fee_type || 'Fee Payment'),
        month: item.month,
        year: item.year,
        amount: parseFloat(String(item.amount || 0)),
        late_fee: parseFloat(String(item.late_fee || 0)),
      }))
      .filter((item) => item.amount > 0 || (item.late_fee ?? 0) > 0);
  } catch {
    return [];
  }
}

export function buildBreakdownFromPaymentFees(
  fees: Array<Record<string, unknown>>,
  academicYear: string,
): StoredFeeBreakdownItem[] {
  let parsedYear;
  try {
    parsedYear = parseAcademicYear(academicYear);
  } catch {
    parsedYear = null;
  }

  const items: StoredFeeBreakdownItem[] = fees.map((f) => {
    const monthRaw = f.month as number | string;
    const monthNum =
      typeof monthRaw === 'number' ? monthRaw : parseInt(String(monthRaw), 10);
    const explicitYear = f.year != null ? parseInt(String(f.year), 10) : null;
    const year =
      parsedYear && Number.isFinite(monthNum)
        ? calendarYearForMonth(parsedYear, monthNum)
        : resolveMonthCalendarYear(monthNum, academicYear, explicitYear);

    const amount =
      f.amount != null
        ? parseFloat(String(f.amount))
        : parseFloat(String(f.amount_due || 0)) - parseFloat(String(f.amount_paid || 0));

    return {
      fee_type: String(f.fee_type || 'Fee Payment'),
      month: monthNum,
      year,
      amount: Math.max(0, amount),
      late_fee: parseFloat(String(f.calculated_late_fee || f.late_fee_amount || 0)),
    };
  });

  return sortFeeBreakdownByAcademicOrder(items, academicYear);
}

export function sortFeeBreakdownByAcademicOrder(
  items: StoredFeeBreakdownItem[],
  academicYear: string,
): StoredFeeBreakdownItem[] {
  const withNumericMonth = items.map((item) => ({
    item,
    month: parseInt(String(item.month), 10),
    year: item.year != null ? parseInt(String(item.year), 10) : undefined,
  }));

  withNumericMonth.sort((a, b) => {
    if (!Number.isFinite(a.month) || !Number.isFinite(b.month)) return 0;
    const seq = calendarMonthToSequenceIndex(a.month) - calendarMonthToSequenceIndex(b.month);
    if (seq !== 0) return seq;
    const yearA = a.year ?? resolveMonthCalendarYear(a.month, academicYear);
    const yearB = b.year ?? resolveMonthCalendarYear(b.month, academicYear);
    return yearA - yearB;
  });

  return withNumericMonth.map(({ item }) => item);
}

function sortMonthEntries(
  items: StoredFeeBreakdownItem[],
  academicYear: string,
): StoredFeeBreakdownItem[] {
  return sortFeeBreakdownByAcademicOrder(items, academicYear);
}
