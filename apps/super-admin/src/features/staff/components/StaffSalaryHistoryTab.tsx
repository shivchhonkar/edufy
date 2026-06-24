'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiDownload } from 'react-icons/fi';

interface PayrollHistoryRow {
  id: number;
  month: number;
  year: number;
  basic_salary: string | number;
  allowances: string | number;
  deductions: string | number;
  net_salary: string | number;
  amount_paid?: string | number | null;
  lop_days?: number | null;
  status: string;
  payment_date?: string | null;
  payment_method?: string | null;
  transaction_id?: string | null;
  is_advance?: boolean | null;
  paid_at?: string | null;
  remarks?: string | null;
}

interface StaffSalaryHistoryTabProps {
  staffId: number;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = parseFloat(String(value ?? 0));
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatPeriod(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function amountPaid(row: PayrollHistoryRow) {
  const paid = parseFloat(String(row.amount_paid ?? 0));
  if (paid > 0) return paid;
  if (row.status === 'paid') return parseFloat(String(row.net_salary ?? 0));
  return 0;
}

function statusClass(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'partial_advance':
      return 'bg-amber-100 text-amber-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function statusLabel(status: string) {
  if (status === 'partial_advance') return 'Partial Advance';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function StaffSalaryHistoryTab({ staffId }: StaffSalaryHistoryTabProps) {
  const [rows, setRows] = useState<PayrollHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total_records: 0, total_paid: 0, paid_months: 0 });

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/payroll/history?limit=36`);
      const data = await res.json();
      if (data.success) {
        setRows(data.data);
        setSummary(data.summary || { total_records: 0, total_paid: 0, paid_months: 0 });
      } else {
        setRows([]);
      }
    } catch (error) {
      console.error('Error loading salary history:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const latestPaid = useMemo(
    () => rows.find((row) => row.status === 'paid' || amountPaid(row) > 0),
    [rows],
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <FiCalendar className="text-primary-600" />
          Salary History
        </h3>
        <p className="mt-0.5 text-sm text-gray-500">Received salary and payroll records</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Payroll Records" value={String(summary.total_records)} />
        <SummaryCard label="Paid Months" value={String(summary.paid_months)} />
        <SummaryCard label="Total Received" value={formatCurrency(summary.total_paid)} />
      </div>

      {latestPaid && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Latest payment: {formatPeriod(latestPaid.month, latestPaid.year)} —{' '}
          {formatCurrency(amountPaid(latestPaid))}
          {latestPaid.payment_date ? ` on ${formatDate(latestPaid.payment_date)}` : ''}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading salary history...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
          No payroll records found for this staff member.
        </div>
      ) : (
        <div className="overflow-hidden overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Period</th>
                <th className="px-4 py-3 text-left font-medium">Net Salary</th>
                <th className="px-4 py-3 text-left font-medium">Received</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Payment Date</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-right font-medium">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formatPeriod(row.month, row.year)}
                    {row.lop_days ? (
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {row.lop_days} LOP day{row.lop_days !== 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{formatCurrency(row.net_salary)}</td>
                  <td className="px-4 py-3 text-green-700">{formatCurrency(amountPaid(row))}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(row.payment_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{row.payment_method || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/api/payroll/payslip/${staffId}?month=${row.month}&year=${row.year}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800"
                    >
                      <FiDownload size={14} />
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
