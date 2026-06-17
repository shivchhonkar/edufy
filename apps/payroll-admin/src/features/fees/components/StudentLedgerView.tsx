'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiCreditCard, FiPrinter } from 'react-icons/fi';
import ReceiptModal from '@/features/fees/components/ReceiptModal';
import RecordPaymentModal from '@/features/fees/components/RecordPaymentModal';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import { ACADEMIC_MONTH_NAMES } from '@/shared/constants/constants';
import { useSettings } from '@/shared/SettingsContext';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';

type LedgerTab = 'overview' | 'monthly' | 'payments' | 'receipts';

interface StudentLedgerViewProps {
  studentId: number;
}

function getCurrentAcademicMonthIndex(): number {
  const calMonth = new Date().getMonth() + 1;
  return calMonth >= 4 ? calMonth - 3 : calMonth + 9;
}

export default function StudentLedgerView({ studentId }: StudentLedgerViewProps) {
  const { settings } = useSettings();
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);
  const [fees, setFees] = useState<Array<Record<string, unknown>>>([]);
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [transportInfo, setTransportInfo] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LedgerTab>('overview');
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Record<string, unknown> | null>(null);

  const academicYear = settings.academic_year || '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const yearParam = academicYear ? `&academic_year=${encodeURIComponent(academicYear)}` : '';
      const [studentRes, feesRes, paymentsRes] = await Promise.all([
        fetch(`/api/students/${studentId}`),
        fetch(`/api/fees/student-fees?student_id=${studentId}${yearParam}`),
        fetch(`/api/fees?student_id=${studentId}`),
      ]);
      const studentData = await studentRes.json();
      const feesData = await feesRes.json();
      const paymentsData = await paymentsRes.json();

      if (studentData.success) setStudent(studentData.data);
      if (feesData.success) {
        setFees(feesData.data);
        setTransportInfo(feesData.transport || null);
      }
      if (paymentsData.success) setPayments(paymentsData.data);
    } finally {
      setLoading(false);
    }
  }, [studentId, academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  const getBalance = (fee: Record<string, unknown>) =>
    Math.max(0, parseFloat(String(fee.amount_due || 0)) - parseFloat(String(fee.amount_paid || 0)));

  const currentAcademicMonth = getCurrentAcademicMonthIndex();

  const monthlyRows = useMemo(() => {
    return ACADEMIC_MONTH_NAMES.map((monthName, idx) => {
      const monthIndex = idx + 1;
      const monthFees = fees.filter((f) => parseInt(String(f.month), 10) === monthIndex);
      const totalDue = monthFees.reduce((s, f) => s + parseFloat(String(f.amount_due || 0)), 0);
      const totalPaid = monthFees.reduce((s, f) => s + parseFloat(String(f.amount_paid || 0)), 0);
      const totalBalance = monthFees.reduce((s, f) => s + getBalance(f), 0);
      return {
        monthIndex,
        monthName,
        monthFees,
        totalDue,
        totalPaid,
        totalBalance,
        isPastOrCurrent: monthIndex <= currentAcademicMonth,
        hasFees: monthFees.length > 0,
      };
    });
  }, [fees, currentAcademicMonth]);

  const totalDue = fees.reduce((s, f) => s + parseFloat(String(f.amount_due || 0)), 0);
  const totalPaidAmount = fees.reduce((s, f) => s + parseFloat(String(f.amount_paid || 0)), 0);
  const totalBalance = fees.reduce((s, f) => s + getBalance(f), 0);
  const overdueBalance = monthlyRows
    .filter((r) => r.isPastOrCurrent && r.totalBalance > 0)
    .reduce((s, r) => s + r.totalBalance, 0);

  const tabs: { id: LedgerTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'monthly', label: 'Monthly Dues' },
    { id: 'payments', label: 'Payments' },
    { id: 'receipts', label: 'Receipts' },
  ];

  if (loading && !student) {
    return <div className="py-20 text-center text-gray-500">Loading ledger...</div>;
  }

  if (!student) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-600">Student not found</p>
        <Link href="/student-fees" className="text-primary-600 text-sm mt-2 inline-block hover:underline">
          Back to ledger
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FeesPageHeader
        title={`${String(student.first_name)} ${String(student.last_name)}`}
        description={[
          String(student.admission_number),
          student.class_name ? String(student.class_name) : '',
          student.section_name ? String(student.section_name) : '',
        ]
          .filter(Boolean)
          .join(' · ')}
        backHref="/student-fees"
        backLabel="Back to Student Ledger"
        actions={
          <button
            type="button"
            onClick={() => setShowPayment(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <FiCreditCard size={16} />
            Collect Fee
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Due" value={formatFeeCurrency(totalDue)} />
        <StatCard label="Total Paid" value={formatFeeCurrency(totalPaidAmount)} tone="green" />
        <StatCard label="Balance" value={formatFeeCurrency(totalBalance)} tone="red" />
        <StatCard label="Overdue" value={formatFeeCurrency(overdueBalance)} tone="amber" />
      </div>

      <div className="border-b flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 text-sm">
          {transportInfo && (
            <p className="text-blue-700">
              Transport: {String(transportInfo.route_name)}
              {transportInfo.stop_name ? ` · ${String(transportInfo.stop_name)}` : ''}
            </p>
          )}
          <p className="text-gray-600">
            {fees.length} fee record(s) · {payments.length} payment(s) this session
          </p>
          <p className="text-gray-600">
            Parent: {String(student.parent_name || '—')} · {String(student.parent_phone || '—')}
          </p>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="space-y-3">
          {monthlyRows
            .filter((row) => row.hasFees || row.isPastOrCurrent)
            .map((row) => (
              <div key={row.monthIndex} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex flex-wrap justify-between gap-2 px-4 py-3 bg-gray-50 border-b">
                  <span className="font-semibold">{row.monthName}</span>
                  <div className="flex gap-4 text-sm">
                    <span>Due: {formatFeeCurrency(row.totalDue)}</span>
                    <span className="text-green-700">Paid: {formatFeeCurrency(row.totalPaid)}</span>
                    <span className={row.totalBalance > 0 ? 'text-red-700 font-medium' : ''}>
                      Balance: {formatFeeCurrency(row.totalBalance)}
                    </span>
                  </div>
                </div>
                {row.monthFees.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400 italic">No fees for this month</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {row.monthFees.map((fee) => (
                      <li key={String(fee.id)} className="px-4 py-2 flex justify-between text-sm">
                        <span>{String(fee.fee_type || 'Fee')}</span>
                        <span>{formatFeeCurrency(getBalance(fee))} due</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {payments.length === 0 ? (
            <p className="p-8 text-center text-gray-500 text-sm">No payments recorded</p>
          ) : (
            payments.map((p) => (
              <div key={String(p.id)} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{String(p.receipt_number || `Payment #${p.id}`)}</p>
                  <p className="text-gray-500">
                    {p.payment_date ? new Date(String(p.payment_date)).toLocaleDateString() : '—'} ·{' '}
                    {String(p.payment_method).toUpperCase()}
                  </p>
                </div>
                <span className="font-semibold text-green-700">
                  {formatFeeCurrency(p.amount_paid as number)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'receipts' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {payments.length === 0 ? (
            <p className="p-8 text-center text-gray-500 text-sm">No receipts available</p>
          ) : (
            payments.map((p) => (
              <div key={String(p.id)} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="text-sm">
                  <p className="font-medium">{String(p.receipt_number)}</p>
                  <p className="text-gray-500">{formatFeeCurrency(p.amount_paid as number)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPayment(p);
                    setShowReceipt(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                >
                  <FiPrinter size={14} />
                  View
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <RecordPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={() => {
          setShowPayment(false);
          load();
        }}
        selectedStudent={student}
      />

      {showReceipt && selectedPayment && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          student={{
            first_name: student.first_name,
            last_name: student.last_name,
            admission_number: student.admission_number,
            class_name: student.class_name,
          }}
        />
      )}
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
    <div className={`rounded-xl border p-4 ${c}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}
