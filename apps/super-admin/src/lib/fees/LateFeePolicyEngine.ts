import type { RequestDb } from '@/lib/request-db';
import { FEE_STATUSES } from '@/lib/fees/constants';

export type LateFeePolicyInput = {
  amountDue: number;
  amountPaid: number;
  dueDate: string | Date;
  asOf?: Date;
  storedLateFee?: number;
  /** From fee structure / version */
  lateFeePercentage?: number;
  lateFeeDays?: number;
  lateFeeFixedAmount?: number;
  lateFeePerDay?: number;
  lateFeeMaxCap?: number | null;
  ruleType?: 'percentage' | 'fixed' | 'per_day' | 'hybrid';
};

export type LateFeePolicyResult = {
  lateFee: number;
  daysOverdue: number;
  withinGrace: boolean;
  appliedRule: string;
};

function daysBetween(due: Date, asOf: Date): number {
  return Math.floor((asOf.getTime() - due.getTime()) / 86400000);
}

/**
 * Reusable late-fee policy engine.
 * Supports percentage, fixed, per-day, hybrid, grace period, and max cap.
 */
export function calculateLateFee(policy: LateFeePolicyInput): LateFeePolicyResult {
  const balance = policy.amountDue - policy.amountPaid;
  if (balance <= 0 || !policy.dueDate) {
    return { lateFee: 0, daysOverdue: 0, withinGrace: true, appliedRule: 'none' };
  }

  const stored = policy.storedLateFee ?? 0;
  if (stored > 0) {
    return { lateFee: stored, daysOverdue: 0, withinGrace: false, appliedRule: 'stored' };
  }

  const asOf = policy.asOf ?? new Date();
  const dueDate = policy.dueDate instanceof Date ? policy.dueDate : new Date(policy.dueDate);
  const daysOverdue = daysBetween(dueDate, asOf);
  const graceDays = policy.lateFeeDays ?? 7;

  if (daysOverdue <= graceDays) {
    return { lateFee: 0, daysOverdue, withinGrace: true, appliedRule: 'grace' };
  }

  const effectiveDays = daysOverdue - graceDays;
  const ruleType = policy.ruleType ?? (policy.lateFeePerDay ? 'hybrid' : 'percentage');

  let lateFee = 0;
  let appliedRule = ruleType;

  switch (ruleType) {
    case 'fixed':
      lateFee = policy.lateFeeFixedAmount ?? 0;
      break;
    case 'per_day':
      lateFee = effectiveDays * (policy.lateFeePerDay ?? 0);
      break;
    case 'hybrid': {
      const pct = (policy.lateFeePercentage ?? 0) > 0
        ? (balance * (policy.lateFeePercentage ?? 0)) / 100
        : 0;
      const fixed = policy.lateFeeFixedAmount ?? 0;
      const perDay = effectiveDays * (policy.lateFeePerDay ?? 0);
      lateFee = Math.max(pct, fixed, perDay);
      appliedRule = 'hybrid';
      break;
    }
    case 'percentage':
    default: {
      const pct = policy.lateFeePercentage ?? 0;
      if (pct <= 0) {
        return { lateFee: 0, daysOverdue, withinGrace: false, appliedRule: 'none' };
      }
      lateFee = (balance * pct) / 100;
      appliedRule = 'percentage';
    }
  }

  if (policy.lateFeeMaxCap != null && policy.lateFeeMaxCap > 0) {
    lateFee = Math.min(lateFee, policy.lateFeeMaxCap);
    appliedRule = `${appliedRule}+cap`;
  }

  lateFee = Math.round(lateFee * 100) / 100;

  return { lateFee, daysOverdue, withinGrace: false, appliedRule };
}

export async function loadLateFeePolicyForFeeRow(
  db: RequestDb,
  row: {
    fee_structure_id?: number | null;
    fee_type?: string | null;
    late_fee_percentage?: string | number | null;
    late_fee_days?: string | number | null;
    late_fee_fixed_amount?: string | number | null;
    late_fee_per_day?: string | number | null;
    late_fee_max_cap?: string | number | null;
  }
): Promise<Partial<LateFeePolicyInput>> {
  if (row.fee_structure_id) {
    const policyResult = await db.query<{
      rule_type: string;
      percentage: string;
      fixed_amount: string;
      per_day_amount: string;
      max_cap: string | null;
      grace_days: number;
    }>(
      `SELECT rule_type, percentage, fixed_amount, per_day_amount, max_cap, grace_days
       FROM fee_late_fee_policies
       WHERE (fee_structure_id = $1 OR fee_type_pattern ILIKE $2)
       AND is_active = true
       ORDER BY fee_structure_id NULLS LAST
       LIMIT 1`,
      [row.fee_structure_id, `%${row.fee_type ?? ''}%`]
    );

    if (policyResult.rows.length > 0) {
      const p = policyResult.rows[0];
      return {
        ruleType: p.rule_type as LateFeePolicyInput['ruleType'],
        lateFeePercentage: parseFloat(p.percentage),
        lateFeeFixedAmount: parseFloat(p.fixed_amount),
        lateFeePerDay: parseFloat(p.per_day_amount),
        lateFeeMaxCap: p.max_cap != null ? parseFloat(p.max_cap) : null,
        lateFeeDays: p.grace_days,
      };
    }
  }

  return {
    lateFeePercentage: parseFloat(String(row.late_fee_percentage ?? 0)),
    lateFeeDays: parseInt(String(row.late_fee_days ?? 7), 10),
    lateFeeFixedAmount: parseFloat(String(row.late_fee_fixed_amount ?? 0)),
    lateFeePerDay: parseFloat(String(row.late_fee_per_day ?? 0)),
    lateFeeMaxCap:
      row.late_fee_max_cap != null ? parseFloat(String(row.late_fee_max_cap)) : null,
  };
}

export async function recalculateStudentFeeStatuses(
  db: RequestDb,
  studentId: number,
  academicYear: string
): Promise<number> {
  const result = await db.query(
    `UPDATE student_fees
     SET status = CASE
       WHEN amount_due <= amount_paid THEN '${FEE_STATUSES.PAID}'
       WHEN due_date < CURRENT_DATE AND amount_due > amount_paid THEN '${FEE_STATUSES.OVERDUE}'
       ELSE '${FEE_STATUSES.PENDING}'
     END,
     updated_at = CURRENT_TIMESTAMP
     WHERE student_id = $1 AND academic_year = $2`,
    [studentId, academicYear]
  );
  return result.rowCount ?? 0;
}
