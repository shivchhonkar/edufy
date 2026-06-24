import { getPeriodCalendarMonths } from '@/lib/fees/AcademicYear';
import { calendarMonthToSequenceIndex } from '@/lib/fees/AcademicYear';
import { getCalendarMonthShortName } from '@/lib/fees/AcademicYear';
import {
  getFeeOutstanding,
  isFeeFullySettled,
  type FeeBalanceRecord,
} from '@/features/fees/utils/fee-balance';
import {
  getOtherFeeCategory,
  isCoreMonthlyFee,
  type OtherFeeCategory,
} from '@/features/fees/utils/fee-type-classification';

export interface FeeStructureRow {
  id: number;
  fee_type: string;
  frequency: string;
  amount: number | string;
  class_id?: number | null;
  academic_year?: string;
}

export interface CollectibleFeeItem {
  key: string;
  id?: number;
  fee_type: string;
  frequency: string;
  category: OtherFeeCategory;
  month: number;
  year?: number;
  amount_due: number;
  amount_paid: number;
  outstanding: number;
  calculated_late_fee?: number;
  selected: boolean;
  isPaid?: boolean;
  status?: string;
  subtitle?: string;
}

function parseMonth(value: unknown): number {
  const month = parseInt(String(value ?? ''), 10);
  return Number.isFinite(month) && month >= 1 && month <= 12 ? month : 4;
}

function sortCollectibleItems(items: CollectibleFeeItem[]): CollectibleFeeItem[] {
  const categoryOrder: Record<OtherFeeCategory, number> = {
    registration: 0,
    annual: 1,
    monthly: 2,
  };

  return [...items].sort((a, b) => {
    const cat = categoryOrder[a.category] - categoryOrder[b.category];
    if (cat !== 0) return cat;
    const monthSeq =
      calendarMonthToSequenceIndex(a.month) - calendarMonthToSequenceIndex(b.month);
    if (monthSeq !== 0) return monthSeq;
    return a.fee_type.localeCompare(b.fee_type);
  });
}

function feeTypeKey(feeType: string): string {
  return feeType.toLowerCase().trim();
}

function studentHasOtherFeeAssignment(
  studentFees: Array<FeeBalanceRecord & { frequency?: string; id?: number }>,
  feeType: string,
  month: number,
  category: OtherFeeCategory,
): boolean {
  return studentFees.some((fee) => {
    if (isCoreMonthlyFee(fee)) return false;
    if (feeTypeKey(String(fee.fee_type || '')) !== feeTypeKey(feeType)) return false;
    if (category === 'monthly') return parseMonth(fee.month) === month;
    return true;
  });
}

export function buildCollectibleOtherFees(params: {
  studentFees: Array<FeeBalanceRecord & { frequency?: string; id?: number }>;
  feeStructures?: FeeStructureRow[];
  classId?: number | null;
  defaultMonth?: number;
}): CollectibleFeeItem[] {
  const { studentFees, feeStructures = [], classId, defaultMonth = 4 } = params;
  const items: CollectibleFeeItem[] = [];
  const assignedStructureIds = new Set<number>();

  for (const fee of studentFees) {
    if (isCoreMonthlyFee(fee)) continue;
    const feeStructureId = (fee as { fee_structure_id?: number }).fee_structure_id;
    if (feeStructureId) assignedStructureIds.add(feeStructureId);
  }

  for (const fee of studentFees) {
    if (isCoreMonthlyFee(fee)) continue;

    const isPaid = isFeeFullySettled(fee);
    const outstanding = isPaid ? 0 : getFeeOutstanding(fee);
    const month = parseMonth(fee.month ?? defaultMonth);
    const category = getOtherFeeCategory(fee);

    items.push({
      key: `sf-${fee.id ?? `${fee.fee_type}-${month}`}`,
      id: fee.id,
      fee_type: String(fee.fee_type || 'Fee'),
      frequency: String(fee.frequency || ''),
      category,
      month,
      year: undefined,
      amount_due: parseFloat(String(fee.amount_due || 0)),
      amount_paid: parseFloat(String(fee.amount_paid || 0)),
      outstanding,
      calculated_late_fee: isPaid
        ? 0
        : parseFloat(String(fee.calculated_late_fee || 0)) || 0,
      selected: false,
      isPaid,
      status: String(fee.status || ''),
      subtitle:
        category === 'monthly'
          ? getCalendarMonthShortName(month)
          : category === 'annual'
            ? 'Annual'
            : 'One-time',
    });
  }

  const relevantStructures = feeStructures.filter((structure) => {
    const asFee = { fee_type: structure.fee_type };
    if (isCoreMonthlyFee(asFee)) return false;
    if (classId && structure.class_id != null && structure.class_id !== classId) return false;
    return true;
  });

  for (const structure of relevantStructures) {
    if (assignedStructureIds.has(structure.id)) continue;

    const category = getOtherFeeCategory(structure);
    const months = getPeriodCalendarMonths(structure.frequency);
    const amount = parseFloat(String(structure.amount || 0));
    if (amount <= 0) continue;

    if (category === 'monthly') {
      for (const month of months) {
        if (
          studentHasOtherFeeAssignment(studentFees, structure.fee_type, month, category)
        ) {
          continue;
        }

        items.push({
          key: `fs-${structure.id}-${month}`,
          fee_type: structure.fee_type,
          frequency: structure.frequency,
          category,
          month,
          amount_due: amount,
          amount_paid: 0,
          outstanding: amount,
          selected: false,
          isPaid: false,
          subtitle: getCalendarMonthShortName(month),
        });
      }
      continue;
    }

    const month = months[0] ?? defaultMonth;
    if (studentHasOtherFeeAssignment(studentFees, structure.fee_type, month, category)) {
      continue;
    }

    items.push({
      key: `fs-${structure.id}`,
      fee_type: structure.fee_type,
      frequency: structure.frequency,
      category,
      month,
      amount_due: amount,
      amount_paid: 0,
      outstanding: amount,
      selected: false,
      isPaid: false,
      subtitle: category === 'registration' ? 'Registration' : 'Annual',
    });
  }

  return sortCollectibleItems(items);
}

export function getCollectibleOtherFeeCharge(
  item: CollectibleFeeItem,
  exemptLateFees: boolean,
): number {
  if (!item.selected || item.isPaid || item.outstanding <= 0) return 0;
  const late =
    exemptLateFees || item.calculated_late_fee == null
      ? 0
      : Math.max(0, item.calculated_late_fee);
  const principal = Math.max(0, item.outstanding - (item.calculated_late_fee || 0));
  return principal + late;
}

export function countSelectedOtherFees(items: CollectibleFeeItem[]): number {
  return items.filter((item) => item.selected && !item.isPaid && item.outstanding > 0).length;
}

export function hasOtherFeeOutstanding(item: CollectibleFeeItem): boolean {
  return !item.isPaid && item.outstanding > 0;
}
