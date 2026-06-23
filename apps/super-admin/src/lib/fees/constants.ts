/** Shared fee module constants — single source for statuses, defaults, and labels. */

export const FEE_STATUSES = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  WAIVED: 'waived',
  EXEMPTED: 'exempted',
} as const;

export type FeeStatus = (typeof FEE_STATUSES)[keyof typeof FEE_STATUSES];

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export const FEE_FREQUENCIES = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  HALF_YEARLY: 'half_yearly',
  YEARLY: 'yearly',
  ONE_TIME: 'one_time',
} as const;

export const INSTALLMENT_ELIGIBLE_FEE_TYPES = [
  'Admission Fee',
  'Annual Fee',
  'Development Fee',
] as const;

export const DEFAULT_DUE_DAY = 10;

export const RECEIPT_PREFIX = 'RCP';

export const ACTIVE_FEE_STATUSES_FOR_PAYMENT = [
  FEE_STATUSES.PENDING,
  FEE_STATUSES.PARTIAL,
  FEE_STATUSES.OVERDUE,
] as const;

export const REPAIRABLE_FEE_STATUSES = [
  FEE_STATUSES.PENDING,
  FEE_STATUSES.PARTIAL,
] as const;
