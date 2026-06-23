export interface FeeBalanceRecord {
  amount_due?: string | number | null;
  amount_paid?: string | number | null;
  calculated_late_fee?: string | number | null;
  status?: string | null;
  fee_type?: string | null;
  month?: string | number | null;
  academic_year?: string | null;
  id?: number;
  late_fee_amount?: string | number | null;
}

export function getFeePrincipalBalance(fee: FeeBalanceRecord): number {
  if (fee.status === 'exempted') return 0;
  return Math.max(
    0,
    parseFloat(String(fee.amount_due || 0)) - parseFloat(String(fee.amount_paid || 0)),
  );
}

export function getFeeLateFeeOutstanding(fee: FeeBalanceRecord): number {
  if (fee.status === 'exempted') return 0;
  const principal = getFeePrincipalBalance(fee);
  if (principal <= 0) return 0;
  return parseFloat(String(fee.calculated_late_fee || 0)) || 0;
}

export function getFeeOutstanding(fee: FeeBalanceRecord): number {
  return getFeePrincipalBalance(fee) + getFeeLateFeeOutstanding(fee);
}

export function isFeeFullySettled(fee: FeeBalanceRecord | null | undefined): boolean {
  if (!fee) return false;
  if (fee.status === 'exempted') return true;
  return getFeeOutstanding(fee) <= 0;
}

export function isTransportFee(fee: FeeBalanceRecord): boolean {
  return String(fee.fee_type || '').toLowerCase().includes('transport');
}

export function isTuitionFee(fee: FeeBalanceRecord): boolean {
  return String(fee.fee_type || '').toLowerCase().includes('tuition');
}

/** Merge duplicate fee rows for the same month (summary and modal must use the same shape). */
export function aggregateFeeRows(fees: FeeBalanceRecord[]): FeeBalanceRecord | null {
  if (fees.length === 0) return null;
  if (fees.length === 1) return fees[0];

  const totalDue = fees.reduce(
    (sum, fee) => sum + parseFloat(String(fee.amount_due || 0)),
    0,
  );
  const totalPaid = fees.reduce(
    (sum, fee) => sum + parseFloat(String(fee.amount_paid || 0)),
    0,
  );
  const totalCalculatedLate = fees.reduce(
    (sum, fee) => sum + (parseFloat(String(fee.calculated_late_fee || 0)) || 0),
    0,
  );

  const anyExempted = fees.some((fee) => fee.status === 'exempted');
  const allSettled = fees.every((fee) => isFeeFullySettled(fee));
  const anyPartial = fees.some((fee) => fee.status === 'partial');
  const anyOverdue = fees.some((fee) => fee.status === 'overdue');
  const primary =
    fees.find((fee) => getFeeOutstanding(fee) > 0) ??
    fees.find((fee) => fee.status === 'partial') ??
    fees[0];

  let status = primary.status;
  if (anyExempted) status = 'exempted';
  else if (allSettled) status = 'paid';
  else if (anyOverdue) status = 'overdue';
  else if (anyPartial || totalPaid > 0) status = 'partial';
  else status = 'pending';

  return {
    ...primary,
    amount_due: totalDue,
    amount_paid: totalPaid,
    calculated_late_fee: totalCalculatedLate,
    status,
  };
}
