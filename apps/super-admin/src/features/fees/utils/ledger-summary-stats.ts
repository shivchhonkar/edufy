import type { FeeStudentRow } from '@/features/fees/components/VirtualizedFeesStudentsTable';

export type MonthPaymentRow = {
  student_id: number;
  amount_paid?: number | string;
};

export type LedgerSummaryStats = {
  totalStudents: number;
  totalOutstanding: number;
  collectedThisMonth: number;
  collectionRate: number;
  paidCount: number;
  pendingCount: number;
  unassignedCount: number;
};

export function computeLedgerSummaryStats(
  students: FeeStudentRow[],
  monthPayments: MonthPaymentRow[] = [],
): LedgerSummaryStats {
  const studentIds = new Set(students.map((s) => s.id));

  const totalOutstanding = students.reduce(
    (sum, student) =>
      student.paymentStatus === 'pending' ? sum + (student.pendingAmount || 0) : sum,
    0,
  );

  const collectedThisMonth = monthPayments
    .filter((payment) => studentIds.has(payment.student_id))
    .reduce((sum, payment) => sum + parseFloat(String(payment.amount_paid || 0)), 0);

  const paidCount = students.filter((s) => s.paymentStatus === 'completed').length;
  const pendingCount = students.filter((s) => s.paymentStatus === 'pending').length;
  const unassignedCount = students.filter((s) => s.paymentStatus === 'not_assigned').length;

  const collectionDenominator = collectedThisMonth + totalOutstanding;
  const collectionRate =
    collectionDenominator > 0
      ? Math.round((collectedThisMonth / collectionDenominator) * 1000) / 10
      : paidCount > 0 && pendingCount === 0 && unassignedCount === 0
        ? 100
        : 0;

  return {
    totalStudents: students.length,
    totalOutstanding,
    collectedThisMonth,
    collectionRate,
    paidCount,
    pendingCount,
    unassignedCount,
  };
}

export function buildLedgerFilterSubtext(options: {
  hasActiveFilters: boolean;
  searchTerm: string;
  classId: string;
  sectionId: string;
  feeStatusFilter: string;
  className?: string;
  sectionName?: string;
  totalStudents: number;
}): string {
  if (!options.hasActiveFilters) {
    return 'All Classes';
  }

  const parts: string[] = [];
  if (options.className) parts.push(options.className);
  if (options.sectionName) parts.push(`Sec. ${options.sectionName}`);
  if (options.feeStatusFilter) {
    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      overdue: 'Overdue',
      due_soon: 'Due Soon',
      completed: 'Paid',
      not_assigned: 'Unassigned',
    };
    parts.push(statusLabels[options.feeStatusFilter] || options.feeStatusFilter);
  }
  if (options.searchTerm.trim()) parts.push('Search');

  if (parts.length === 0) {
    return `${options.totalStudents} filtered`;
  }

  return parts.join(' · ');
}
