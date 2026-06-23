'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiCreditCard, FiFileText } from 'react-icons/fi';
import { useSettings } from '@/shared/SettingsContext';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import {
  aggregateFeeRows,
  getFeeOutstanding,
  getFeePrincipalBalance,
  isTransportFee,
  isTuitionFee,
  type FeeBalanceRecord,
} from '@/features/fees/utils/fee-balance';
import type { FeeStudentRow } from '@/features/fees/components/VirtualizedFeesStudentsTable';

interface StudentCollectSummaryProps {
  student: FeeStudentRow;
  onCollect: () => void;
  refreshKey?: number;
}

function aggregateFeesForSummary(fees: FeeBalanceRecord[]): FeeBalanceRecord[] {
  const groups = new Map<string, FeeBalanceRecord[]>();

  for (const fee of fees) {
    const month = parseInt(String(fee.month), 10);
    const typeKey = isTransportFee(fee)
      ? 'transport'
      : isTuitionFee(fee)
        ? 'tuition'
        : String(fee.fee_type || 'other').toLowerCase();
    const key = `${month}:${typeKey}`;
    const list = groups.get(key) ?? [];
    list.push(fee);
    groups.set(key, list);
  }

  return Array.from(groups.values())
    .map((group) => aggregateFeeRows(group))
    .filter((fee): fee is FeeBalanceRecord => fee != null);
}

function deriveProfileStatus(
  fees: FeeBalanceRecord[],
  totalOutstanding: number,
): string {
  if (fees.length === 0) return 'Not Assigned';
  if (totalOutstanding <= 0) return 'Paid';

  const hasOverdue = fees.some(
    (f) => f.status === 'overdue' && getFeePrincipalBalance(f) > 0,
  );
  if (hasOverdue) return 'Overdue';

  const hasPartial = fees.some((f) => f.status === 'partial' && getFeePrincipalBalance(f) > 0);
  if (hasPartial) return 'Partial';

  return 'Pending';
}

export default function StudentCollectSummary({
  student,
  onCollect,
  refreshKey = 0,
}: StudentCollectSummaryProps) {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [outstanding, setOutstanding] = useState(0);
  const [currentMonthDue, setCurrentMonthDue] = useState(0);
  const [transportDue, setTransportDue] = useState(0);
  const [profileStatus, setProfileStatus] = useState('—');
  const [recentPayments, setRecentPayments] = useState<Array<Record<string, unknown>>>([]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ student_id: String(student.id) });
      if (settings.academic_year) {
        params.set('academic_year', settings.academic_year);
      }

      const [feesRes, paymentsRes] = await Promise.all([
        fetch(`/api/fees/student-fees?${params}`),
        fetch(`/api/fees?student_id=${student.id}`),
      ]);
      const feesData = await feesRes.json();
      const paymentsData = await paymentsRes.json();

      const fees: FeeBalanceRecord[] = feesData.success ? feesData.data : [];
      const aggregatedFees = aggregateFeesForSummary(fees);
      const currentCalendarMonth = new Date().getMonth() + 1;

      let totalOutstanding = 0;
      let monthDue = 0;
      let transportOutstanding = 0;

      for (const fee of aggregatedFees) {
        const balance = getFeeOutstanding(fee);
        totalOutstanding += balance;

        if (isTransportFee(fee)) {
          transportOutstanding += balance;
        }

        const feeMonth = parseInt(String(fee.month), 10);
        if (feeMonth === currentCalendarMonth) {
          monthDue += balance;
        }
      }

      setOutstanding(totalOutstanding);
      setCurrentMonthDue(monthDue);
      setTransportDue(transportOutstanding);
      setProfileStatus(deriveProfileStatus(aggregatedFees, totalOutstanding));
      setRecentPayments(paymentsData.success ? paymentsData.data.slice(0, 3) : []);
    } catch {
      setOutstanding(student.pendingAmount || 0);
      setProfileStatus(
        formatListPaymentStatus(student.paymentStatus) || 'Unknown',
      );
    } finally {
      setLoading(false);
    }
  }, [student.id, student.pendingAmount, student.paymentStatus, settings.academic_year]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, refreshKey]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-48" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100">
        <SummaryCell label="Outstanding" value={formatFeeCurrency(outstanding)} highlight="red" />
        <SummaryCell label="Current Month Due" value={formatFeeCurrency(currentMonthDue)} />
        <SummaryCell label="Transport Due" value={formatFeeCurrency(transportDue)} />
        <SummaryCell label="Profile Status" value={profileStatus} isText />
      </div>

      {recentPayments.length > 0 && (
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Recent Payments
          </p>
          <div className="space-y-2">
            {recentPayments.map((p) => (
              <div key={String(p.id)} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {p.payment_date
                    ? new Date(String(p.payment_date)).toLocaleDateString()
                    : '—'}
                </span>
                <span className="font-medium text-green-700">
                  {formatFeeCurrency(p.amount_paid as number)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 flex flex-wrap gap-3 p-4 bg-gray-50 border-t border-gray-100">
        <button
          type="button"
          onClick={onCollect}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 shadow-sm"
        >
          <FiCreditCard size={18} />
          Collect Fee
        </button>
        <Link
          href={`/fees/ledger/${student.id}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white"
        >
          <FiFileText size={16} />
          View Ledger
        </Link>
      </div>
    </div>
  );
}

function formatListPaymentStatus(status?: string): string {
  if (!status) return '—';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function SummaryCell({
  label,
  value,
  highlight,
  isText,
}: {
  label: string;
  value: string;
  highlight?: 'red';
  isText?: boolean;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 font-semibold ${
          highlight === 'red' ? 'text-red-700' : 'text-gray-900'
        } ${isText ? 'text-sm' : 'text-lg'}`}
      >
        {value}
      </p>
    </div>
  );
}
