'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FiCreditCard, FiMoreVertical, FiRefreshCw, FiSend, FiZap } from 'react-icons/fi';
import { useSettings } from '@/shared/SettingsContext';
import { useFeesStats } from '@/features/fees/hooks/useFeesStats';
import FeesDashboardCharts from '@/features/fees/components/FeesDashboardCharts';
import VirtualizedTable from '@/shared/components/common/VirtualizedTable';
import { formatFeeCurrency, getPaymentMethodBadgeClass } from '@/features/fees/utils/fees-format';

export default function FeesDashboardPage() {
  const { settings } = useSettings();
  const { stats, loading, refresh } = useFeesStats(settings.academic_year);
  const [refreshing, setRefreshing] = useState(false);

  const statCards = useMemo(
    () =>
      stats
        ? [
            { label: 'Total Collected', value: stats.total_collected, tone: 'blue' },
            { label: 'Pending Fees', value: stats.total_pending, tone: 'amber' },
            { label: 'Overdue Fees', value: stats.total_overdue, tone: 'red' },
            { label: 'Collection This Month', value: stats.this_month, tone: 'green' },
            { label: 'Pending Students', value: stats.pending_students_count, tone: 'purple', isCount: true },
          ]
        : [],
    [stats],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            {settings.school_name || 'School fees overview'}
            {settings.academic_year && (
              <span className="ml-2 inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                {settings.academic_year}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
          Refresh
        </button>
      </header>

      {loading && !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction href="/fees/collect" icon={FiCreditCard} label="Collect Fee" primary />
            <QuickAction href="/fees/operations" icon={FiZap} label="Generate Fees" />
            <QuickAction href="/fees/receipts" icon={FiCreditCard} label="Print Receipts" />
            <QuickAction href="/fees/reminders" icon={FiSend} label="Send Reminders" />
          </div>

          <FeesDashboardCharts stats={stats} />

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Recent Payments</h2>
              <Link href="/fees/receipts" className="text-sm text-primary-600 hover:underline">
                View all
              </Link>
            </div>
            <div className="min-h-[240px] max-h-[420px] rounded-lg border border-gray-100">
              <VirtualizedTable
                rows={(stats.recent_payments || []) as Array<Record<string, unknown>>}
                getRowKey={(payment) => String(payment.id)}
                rowHeight={62}
                maxHeight={420}
                minWidth={980}
                emptyMessage="No recent payments"
                rowClassName="hover:bg-gray-50 border-b border-gray-100"
                columns={[
                  {
                    key: 'student_name',
                    header: 'Student Name',
                    width: '1.5fr',
                    render: (payment) => (
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
                          {String(payment.first_name || '')
                            .charAt(0)
                            .toUpperCase()}
                          {String(payment.last_name || '')
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <Link
                          href={`/fees/ledger/${String(payment.student_id)}`}
                          className="font-medium text-gray-900 text-sm hover:text-primary-700 hover:underline"
                        >
                          {String(payment.first_name)} {String(payment.last_name)}
                        </Link>
                      </div>
                    ),
                  },
                  {
                    key: 'admission',
                    header: 'Admission No.',
                    width: '1fr',
                    render: (payment) => (
                      <span className="text-xs text-gray-600 font-medium">
                        {String(payment.admission_number || '—')}
                      </span>
                    ),
                  },
                  {
                    key: 'class',
                    header: 'Class',
                    width: '0.7fr',
                    render: (payment) => (
                      <span className="text-xs text-gray-700">
                        {String(payment.class_name || '—')}
                        {payment.section_name ? `-${String(payment.section_name)}` : ''}
                      </span>
                    ),
                  },
                  {
                    key: 'method',
                    header: 'Payment Mode',
                    width: '0.85fr',
                    render: (payment) => (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getPaymentMethodBadgeClass(
                          String(payment.payment_method),
                        )}`}
                      >
                        {String(payment.payment_method).toUpperCase()}
                      </span>
                    ),
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    width: '0.9fr',
                    cellClassName: 'font-semibold text-green-700',
                    render: (payment) => <span>{formatFeeCurrency(payment.amount_paid as number)}</span>,
                  },
                  {
                    key: 'date',
                    header: 'Date',
                    width: '1fr',
                    render: (payment) => (
                      <div className="text-xs text-gray-600">
                        {payment.payment_date ? (
                          <>
                            <p>
                              {new Date(String(payment.payment_date)).toLocaleDateString('en-US', {
                                month: 'short',
                                day: '2-digit',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {new Date(String(payment.payment_date)).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                          </>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'receipt',
                    header: 'Receipt No.',
                    width: '1fr',
                    render: (payment) => (
                      <Link
                        href={`/fees/receipts?payment_id=${String(payment.id)}`}
                        className="text-xs text-primary-700 font-medium hover:underline"
                      >
                        {String(payment.receipt_number || `RCP-${String(payment.id).padStart(4, '0')}`)}
                      </Link>
                    ),
                  },
                  {
                    key: 'action',
                    header: 'Action',
                    width: '0.5fr',
                    cellClassName: 'text-right',
                    render: () => (
                      <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100"
                        aria-label="Payment actions"
                      >
                        <FiMoreVertical size={14} />
                      </button>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">Unable to load dashboard data.</p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  isCount,
}: {
  label: string;
  value: number;
  tone: string;
  isCount?: boolean;
}) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl mt-1">
        {isCount ? value : formatFeeCurrency(value)}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  primary,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
        primary
          ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
          : 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50'
      }`}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}
