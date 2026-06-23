import type { FeeBalanceRecord } from '@/features/fees/utils/fee-balance';
import { isTransportFee, isTuitionFee } from '@/features/fees/utils/fee-balance';

export type OtherFeeCategory = 'registration' | 'annual' | 'monthly';

export function isRegistrationFeeType(feeType: string): boolean {
  const type = feeType.toLowerCase();
  return type.includes('registration') || type.includes('admission');
}

export function isAnnualFeeTypeName(feeType: string): boolean {
  const type = feeType.toLowerCase();
  return (
    type.includes('examination') ||
    type.includes('exam') ||
    type.includes('laboratory') ||
    type.includes('library') ||
    type.includes('sport') ||
    type.includes('development')
  );
}

export function isActivityFeeType(feeType: string): boolean {
  return feeType.toLowerCase().includes('activity');
}

export function isCoreMonthlyFee(fee: FeeBalanceRecord): boolean {
  return isTuitionFee(fee) || isTransportFee(fee);
}

export function getOtherFeeCategory(fee: {
  fee_type?: string | null;
  frequency?: string | null;
}): OtherFeeCategory {
  const feeType = String(fee.fee_type || '');
  const frequency = String(fee.frequency || '').toLowerCase();

  if (isRegistrationFeeType(feeType)) {
    return 'registration';
  }

  if (isActivityFeeType(feeType) && frequency === 'monthly') {
    return 'monthly';
  }

  if (
    frequency === 'yearly' ||
    frequency === 'one_time' ||
    frequency === 'quarterly' ||
    frequency === 'half_yearly' ||
    isAnnualFeeTypeName(feeType)
  ) {
    return 'annual';
  }

  return 'monthly';
}

export function getOtherFeeCategoryLabel(category: OtherFeeCategory): string {
  switch (category) {
    case 'registration':
      return 'Registration Fees';
    case 'annual':
      return 'Annual Charges';
    case 'monthly':
      return 'Activity & Monthly Fees';
    default:
      return 'Other Fees';
  }
}
