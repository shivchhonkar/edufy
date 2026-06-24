'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiCalendar, FiChevronDown, FiChevronUp, FiCreditCard, FiExternalLink } from 'react-icons/fi';
import { ACADEMIC_MONTH_NAMES, ACADEMIC_MONTHS } from '@/shared/constants/constants';
import {
  getCurrentCalendarMonth,
  isCalendarMonthOnOrBefore,
} from '@/lib/fees/AcademicYear';
import { useSettings } from '@/shared/SettingsContext';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';

interface FeeRecord {
  id: number;
  month: number | string;
  fee_type?: string;
  amount_due?: number | string;
  amount_paid?: number | string;
  status?: string;
}

interface TransportInfo {
  route_name: string;
  stop_name?: string | null;
  transport_fee?: number;
}

interface FeesTabProps {
  studentId: number;
}

function getBalance(fee: FeeRecord) {
  return Math.max(
    0,
    parseFloat(String(fee.amount_due || 0)) - parseFloat(String(fee.amount_paid || 0)),
  );
}

function feeStatusLabel(fee: FeeRecord) {
  const balance = getBalance(fee);
  if (balance <= 0) return 'Paid';
  const paid = parseFloat(String(fee.amount_paid || 0));
  if (paid > 0) return 'Partial';
  return 'Pending';
}

function feeStatusClass(status: string) {
  switch (status) {
    case 'Paid':
      return 'bg-green-100 text-green-800';
    case 'Partial':
      return 'bg-blue-100 text-blue-800';
    case 'Pending':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function monthStatusLabel(row: {
  hasFees: boolean;
  totalBalance: number;
  totalPaid: number;
  isPastOrCurrent: boolean;
}) {
  if (!row.hasFees) {
    return row.isPastOrCurrent ? 'No fees' : 'Upcoming';
  }
  if (row.totalBalance > 0) {
    return row.totalPaid > 0 ? 'Partial' : 'Pending';
  }
  return 'Paid';
}

const DEFAULT_VISIBLE_MONTHS = 6;

export default function FeesTab({ studentId }: FeesTabProps) {
  const { settings } = useSettings();
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<Array<{ amount_paid?: number | string }>>([]);
  const [transportInfo, setTransportInfo] = useState<TransportInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const [showAllMonths, setShowAllMonths] = useState(false);

  const academicYear = settings.academic_year || '';

  const loadFees = useCallback(async () => {
    setLoading(true);
    try {
      const yearParam = academicYear ? `&academic_year=${encodeURIComponent(academicYear)}` : '';
      const [feesRes, paymentsRes] = await Promise.all([
        fetch(`/api/fees/student-fees?student_id=${studentId}${yearParam}`),
        fetch(`/api/fees?student_id=${studentId}`),
      ]);
      const feesData = await feesRes.json();
      const paymentsData = await paymentsRes.json();

      if (feesData.success) {
        setFees(feesData.data);
        setTransportInfo(feesData.transport || null);
      } else {
        setFees([]);
        setTransportInfo(null);
      }

      if (paymentsData.success) {
        setPayments(paymentsData.data);
      } else {
        setPayments([]);
      }
    } catch {
      setFees([]);
      setTransportInfo(null);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, academicYear]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  useEffect(() => {
    setExpandedMonths(new Set());
    setShowAllMonths(false);
  }, [studentId, academicYear]);

  const currentCalendarMonth = getCurrentCalendarMonth();

  const monthlyRows = useMemo(() => {
    return ACADEMIC_MONTH_NAMES.map((monthName, idx) => {
      const calendarMonth = ACADEMIC_MONTHS[idx];
      const monthFees = fees.filter((f) => parseInt(String(f.month), 10) === calendarMonth);
      const totalDue = monthFees.reduce((s, f) => s + parseFloat(String(f.amount_due || 0)), 0);
      const totalPaid = monthFees.reduce((s, f) => s + parseFloat(String(f.amount_paid || 0)), 0);
      const totalBalance = monthFees.reduce((s, f) => s + getBalance(f), 0);
      return {
        monthIndex: calendarMonth,
        monthName,
        monthFees,
        totalDue,
        totalPaid,
        totalBalance,
        isPastOrCurrent: isCalendarMonthOnOrBefore(calendarMonth, currentCalendarMonth),
        hasFees: monthFees.length > 0,
      };
    });
  }, [fees, currentCalendarMonth]);

  const totalDue = fees.reduce((s, f) => s + parseFloat(String(f.amount_due || 0)), 0);
  const totalPaidAmount = fees.reduce((s, f) => s + parseFloat(String(f.amount_paid || 0)), 0);
  const totalBalance = fees.reduce((s, f) => s + getBalance(f), 0);
  const totalPayments = payments.reduce(
    (s, p) => s + parseFloat(String(p.amount_paid || 0)),
    0,
  );
  const pendingCount = fees.filter((f) => getBalance(f) > 0).length;
  const overdueBalance = monthlyRows
    .filter((r) => r.isPastOrCurrent && r.totalBalance > 0)
    .reduce((s, r) => s + r.totalBalance, 0);

  const filteredMonthlyRows = useMemo(
    () => monthlyRows.filter((row) => row.hasFees || row.isPastOrCurrent),
    [monthlyRows],
  );

  const visibleMonthlyRows = useMemo(() => {
    if (showAllMonths) return filteredMonthlyRows;
    return filteredMonthlyRows.slice(0, DEFAULT_VISIBLE_MONTHS);
  }, [filteredMonthlyRows, showAllMonths]);

  const toggleMonth = (monthIndex: number) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthIndex)) {
        next.delete(monthIndex);
      } else {
        next.add(monthIndex);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-gray-500 text-sm">Loading fee status...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FiCreditCard className="text-primary-600" />
            Fee Status
          </h3>
          {academicYear && (
            <p className="text-sm text-gray-500 mt-0.5">Academic year: {academicYear}</p>
          )}
        </div>
        <Link
          href={`/fees/ledger/${studentId}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary-700 hover:text-primary-800 font-medium"
        >
          Full ledger
          <FiExternalLink size={14} />
        </Link>
      </div>

      {transportInfo && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Transport: {transportInfo.route_name}
          {transportInfo.stop_name ? ` · ${transportInfo.stop_name}` : ''}
          {transportInfo.transport_fee != null
            ? ` · ${formatFeeCurrency(transportInfo.transport_fee)}/month`
            : ''}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Due" value={formatFeeCurrency(totalDue)} />
        <StatCard label="Total Paid" value={formatFeeCurrency(totalPaidAmount)} tone="green" />
        <StatCard label="Balance" value={formatFeeCurrency(totalBalance)} tone="red" />
        <StatCard label="Overdue" value={formatFeeCurrency(overdueBalance)} tone="amber" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        {pendingCount} pending fee record(s) · {formatFeeCurrency(totalPayments)} collected via{' '}
        {payments.length} payment(s)
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Monthly breakdown</h4>
        {filteredMonthlyRows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center border border-gray-200 rounded-lg bg-white">
            No fee records found for this academic year.
          </p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-600">
                    <th className="px-4 py-3 text-left font-medium">Month</th>
                    <th className="px-4 py-3 text-right font-medium">Due (₹)</th>
                    <th className="px-4 py-3 text-right font-medium">Paid (₹)</th>
                    <th className="px-4 py-3 text-right font-medium">Balance (₹)</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-center font-medium w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMonthlyRows.map((row) => {
                    const isExpanded = expandedMonths.has(row.monthIndex);
                    const status = monthStatusLabel(row);

                    return (
                      <Fragment key={row.monthIndex}>
                        <tr
                          className={`border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                            isExpanded ? 'bg-primary-50/30' : ''
                          }`}
                          onClick={() => toggleMonth(row.monthIndex)}
                        >
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                              <FiCalendar className="text-gray-400 shrink-0" size={14} />
                              {row.monthName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            {formatFeeCurrency(row.totalDue)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-700">
                            {formatFeeCurrency(row.totalPaid)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right ${
                              row.totalBalance > 0 ? 'text-red-700 font-medium' : 'text-gray-900'
                            }`}
                          >
                            {formatFeeCurrency(row.totalBalance)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${feeStatusClass(status)}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500">
                            {isExpanded ? (
                              <FiChevronUp size={16} className="inline-block" />
                            ) : (
                              <FiChevronDown size={16} className="inline-block" />
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b last:border-b-0 bg-gray-50/60">
                            <td colSpan={6} className="px-4 py-3">
                              {row.monthFees.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">
                                  No fees assigned for this month.
                                </p>
                              ) : (
                                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden">
                                  {row.monthFees.map((fee) => {
                                    const feeStatus = feeStatusLabel(fee);
                                    return (
                                      <li
                                        key={fee.id}
                                        className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="truncate">{fee.fee_type || 'Fee'}</span>
                                          <span
                                            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${feeStatusClass(feeStatus)}`}
                                          >
                                            {feeStatus}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-gray-600 shrink-0">
                                          <span>Due: {formatFeeCurrency(fee.amount_due)}</span>
                                          <span>Paid: {formatFeeCurrency(fee.amount_paid)}</span>
                                          {getBalance(fee) > 0 && (
                                            <span className="text-red-700 font-medium">
                                              Pending: {formatFeeCurrency(getBalance(fee))}
                                            </span>
                                          )}
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!showAllMonths && filteredMonthlyRows.length > DEFAULT_VISIBLE_MONTHS && (
              <button
                type="button"
                onClick={() => setShowAllMonths(true)}
                className="w-full px-4 py-3 text-sm font-medium text-primary-700 hover:bg-primary-50 border-t border-gray-200 inline-flex items-center justify-center gap-1.5"
              >
                View all {filteredMonthlyRows.length} months
                <FiChevronDown size={14} />
              </button>
            )}
            {showAllMonths && filteredMonthlyRows.length > DEFAULT_VISIBLE_MONTHS && (
              <button
                type="button"
                onClick={() => setShowAllMonths(false)}
                className="w-full px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 border-t border-gray-200 inline-flex items-center justify-center gap-1.5"
              >
                Show fewer months
                <FiChevronUp size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'green' | 'red' | 'amber';
}) {
  const tones = {
    green: 'bg-green-50 border-green-100 text-green-800',
    red: 'bg-red-50 border-red-100 text-red-800',
    amber: 'bg-amber-50 border-amber-100 text-amber-800',
    default: 'bg-white border-gray-200 text-gray-900',
  };
  const c = tone ? tones[tone] : tones.default;
  return (
    <div className={`rounded-lg border p-3 ${c}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-base mt-0.5">{value}</p>
    </div>
  );
}
