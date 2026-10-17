'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FiCreditCard, FiRefreshCw, FiSend, FiZap } from 'react-icons/fi';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import { useFeesStats } from '@/features/fees/hooks/useFeesStats';
import { useFeesStudents } from '@/features/fees/hooks/useFeesStudents';
import FeesDashboardCharts from '@/features/fees/components/FeesDashboardCharts';
import VirtualizedTable from '@/shared/components/common/VirtualizedTable';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';
import { formatFeeCurrency, getPaymentMethodBadgeClass } from '@/features/fees/utils/fees-format';
import { ACADEMIC_MONTH_SEQUENCE, getCalendarMonthShortName } from '@/lib/fees/AcademicYear';
import type { FeeStudentRow } from '@/features/fees/components/VirtualizedFeesStudentsTable';

export default function FeesDashboardPage() {
  const { settings } = useSettings();
  const { alert, confirm } = useDialog();
  const { stats, loading, error, refresh } = useFeesStats(settings.academic_year);
  const { students, loading: studentsLoading, refresh: refreshStudents } = useFeesStudents(settings.academic_year);
  const [refreshing, setRefreshing] = useState(false);
  const [listTab, setListTab] = useState<'recent' | 'pending'>('recent');
  const [remindingId, setRemindingId] = useState<number | null>(null);

  const pendingStudents = useMemo(
    () =>
      students
        .filter((student) => (student.pendingAmount || 0) > 0)
        .sort((a, b) => (b.pendingAmount || 0) - (a.pendingAmount || 0)),
    [students],
  );

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

  const sendReminder = async (student: FeeStudentRow) => {
    const name = `${student.first_name} ${student.last_name}`.trim();
    const amount = formatFeeCurrency(student.pendingAmount);
    const months = pendingMonthLabels(student);
    const ok = await confirm(
      `Send a fee reminder to ${name} for ${amount}${months ? ` (${months})` : ''}?`,
      { title: 'Send reminder', confirmText: 'Send' },
    );
    if (!ok) return;

    setRemindingId(student.id);
    try {
      const res = await fetch('/api/fees/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: [student.id],
          channels: ['sms'],
          message: `Dear Parent, fees of ${amount} are pending for ${name}${months ? ` for ${months}` : ''}. Kindly clear the dues at the earliest.`,
          academic_year: settings.academic_year,
          amounts: { [String(student.id)]: student.pendingAmount || 0 },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        await alert(data.error || 'Failed to send reminder', { title: 'Error', type: 'error' });
        return;
      }
      await alert(`Reminder sent for ${name}.`, { title: 'Reminder sent', type: 'success' });
    } catch {
      await alert('Failed to send reminder', { title: 'Error', type: 'error' });
    } finally {
      setRemindingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshStudents()]);
    setRefreshing(false);
  };

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Fees</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            {settings.school_name || 'Collections, pending balances, and recent payments.'}
            {settings.academic_year && (
              <span className="ml-2 inline-flex rounded-full border border-primary-100 bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                {settings.academic_year}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
          Refresh
        </button>
      </header>

      {loading && !stats ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickAction href="/fees/collect" icon={FiCreditCard} label="Collect fee" primary />
            <QuickAction href="/fees/operations" icon={FiZap} label="Generate fees" />
            <QuickAction href="/fees/receipts" icon={FiCreditCard} label="Print receipts" />
            <QuickAction href="/fees/reminders" icon={FiSend} label="Send reminders" />
          </div>

          <FeesDashboardCharts stats={stats} />

          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
              <div className={moduleTabBarClass} role="tablist" aria-label="Payment lists">
                <button
                  type="button"
                  role="tab"
                  aria-selected={listTab === 'recent'}
                  onClick={() => setListTab('recent')}
                  className={moduleTabClass(listTab === 'recent')}
                >
                  Recent payments
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={listTab === 'pending'}
                  onClick={() => setListTab('pending')}
                  className={moduleTabClass(listTab === 'pending')}
                >
                  Pending payments
                  <span className={`ml-1.5 tabular-nums ${listTab === 'pending' ? 'text-white/80' : 'text-amber-700'}`}>
                    {studentsLoading ? '…' : pendingStudents.length}
                  </span>
                </button>
              </div>
              <Link
                href={listTab === 'recent' ? '/fees/receipts' : '/fees/outstanding'}
                className="text-xs font-medium text-primary-600 hover:text-primary-800"
              >
                View all
              </Link>
            </div>
            <div className="min-h-[220px] max-h-[420px]">
              {listTab === 'pending' ? (
                <VirtualizedTable
                  rows={pendingStudents}
                  getRowKey={(student) => student.id}
                  rowHeight={64}
                  maxHeight={420}
                  minWidth={980}
                  emptyMessage={studentsLoading ? 'Loading pending payments…' : 'No students with a pending balance'}
                  rowClassName="hover:bg-gray-50 border-b border-gray-100"
                  columns={[
                    {
                      key: 'sn',
                      header: 'S.N.',
                      width: '3rem',
                      render: (_student, index) => (
                        <span className="text-xs tabular-nums text-gray-500">{index + 1}</span>
                      ),
                    },
                    {
                      key: 'student_name',
                      header: 'Student',
                      width: '1.7fr',
                      render: (student) => {
                        const classLine = [student.class_name, student.section_name].filter(Boolean).join(' · ');
                        return (
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-[10px] font-semibold text-amber-700">
                              {String(student.first_name || '').charAt(0).toUpperCase()}
                              {String(student.last_name || '').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/fees/ledger/${student.id}`}
                                className="block truncate text-xs font-medium text-gray-900 hover:text-primary-700"
                              >
                                {student.first_name} {student.last_name}
                              </Link>
                              <p className="truncate text-[11px] text-gray-500">
                                {student.admission_number || '—'}
                                {classLine ? ` · ${classLine}` : ''}
                              </p>
                            </div>
                          </div>
                        );
                      },
                    },
                    {
                      key: 'months',
                      header: 'Pending months',
                      width: '1.8fr',
                      render: (student) => <PendingMonths student={student} />,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      width: '0.7fr',
                      render: () => (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                          Pending
                        </span>
                      ),
                    },
                    {
                      key: 'pending',
                      header: 'Pending',
                      width: '0.9fr',
                      cellClassName: 'font-semibold text-amber-700',
                      render: (student) => (
                        <span className="text-xs tabular-nums">{formatFeeCurrency(student.pendingAmount)}</span>
                      ),
                    },
                    {
                      key: 'collect',
                      header: '',
                      width: '0.6fr',
                      cellClassName: 'justify-end',
                      render: (student) => (
                        <Link
                          href={`/fees/ledger/${student.id}`}
                          className="text-xs font-medium text-primary-600 hover:text-primary-800"
                        >
                          Collect
                        </Link>
                      ),
                    },
                    {
                      key: 'reminder',
                      header: 'Send reminder',
                      width: '1.1fr',
                      render: (student) => (
                        <button
                          type="button"
                          disabled={remindingId === student.id}
                          onClick={() => sendReminder(student)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 disabled:opacity-50"
                        >
                          <FiSend size={12} />
                          {remindingId === student.id ? 'Sending…' : 'Send reminder'}
                        </button>
                      ),
                    },
                  ]}
                />
              ) : (
              <VirtualizedTable
                rows={(stats.recent_payments || []) as Array<Record<string, unknown>>}
                getRowKey={(payment) => String(payment.id)}
                rowHeight={52}
                maxHeight={420}
                minWidth={860}
                emptyMessage="No recent payments"
                rowClassName="hover:bg-gray-50 border-b border-gray-100"
                columns={[
                  {
                    key: 'student_name',
                    header: 'Student Name',
                    width: '1.5fr',
                    render: (payment) => (
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[10px] font-semibold text-primary-700">
                          {String(payment.first_name || '')
                            .charAt(0)
                            .toUpperCase()}
                          {String(payment.last_name || '')
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <Link
                          href={`/fees/ledger/${String(payment.student_id)}`}
                          className="truncate text-xs font-medium text-gray-900 hover:text-primary-700"
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
                    render: (payment) => (
                      <span className="text-xs tabular-nums">{formatFeeCurrency(payment.amount_paid as number)}</span>
                    ),
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
                              {new Date(String(payment.payment_date)).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {new Date(String(payment.payment_date)).toLocaleTimeString('en-IN', {
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
                ]}
              />
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-xs text-gray-500 shadow-sm">
          {error || 'Unable to load dashboard data.'}
        </div>
      )}
    </div>
  );
}

function pendingMonthLabels(student: FeeStudentRow) {
  const labels = [...(student.pendingMonths || [])]
    .filter((month) => month >= 1 && month <= 12)
    .sort((a, b) => ACADEMIC_MONTH_SEQUENCE.indexOf(a) - ACADEMIC_MONTH_SEQUENCE.indexOf(b))
    .map((month) => getCalendarMonthShortName(month));
  if (student.hasOtherPending) labels.push('Other');
  return labels.join(', ');
}

function PendingMonths({ student }: { student: FeeStudentRow }) {
  const text = pendingMonthLabels(student);
  if (!text) return <span className="text-xs text-gray-400">—</span>;
  return (
    <p className="line-clamp-2 text-[11px] leading-4 text-gray-700" title={text}>
      {text}
    </p>
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
    blue: 'text-gray-900',
    amber: 'text-amber-700',
    red: 'text-red-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums leading-tight ${tones[tone]}`}>
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium shadow-sm ${
        primary
          ? 'bg-primary-600 text-white hover:bg-primary-700'
          : 'border border-gray-200 bg-white text-gray-700 hover:border-primary-200 hover:text-primary-700'
      }`}
    >
      <Icon size={14} />
      {label}
    </Link>
  );
}
