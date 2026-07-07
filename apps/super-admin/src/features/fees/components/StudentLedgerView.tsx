'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiDownload,
  FiMoreVertical,
  FiPlus,
  FiPrinter,
} from 'react-icons/fi';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import ReceiptModal from '@/features/fees/components/ReceiptModal';
import RecordPaymentModal from '@/features/fees/components/RecordPaymentModal';
import LedgerPaymentDetailsModal, {
  type LedgerPayableFee,
} from '@/features/fees/components/LedgerPaymentDetailsModal';
import LedgerMonthFeeSelector, {
  countSelectedMonths,
  type LedgerMonthFeeRecord,
} from '@/features/fees/components/LedgerMonthFeeSelector';
import { loadPaymentReceipt } from '@/features/fees/utils/load-payment-receipt';
import { useDialog } from '@/shared/context/DialogContext';
import { ACADEMIC_MONTH_NAMES, ACADEMIC_MONTHS } from '@/shared/constants/constants';
import {
  calendarYearForMonth,
  getCurrentCalendarMonth,
  isCalendarMonthOnOrBefore,
  parseAcademicYear,
} from '@/lib/fees/AcademicYear';
import { getFeeLateFeeOutstanding, getFeeOutstanding, isTransportFee } from '@/features/fees/utils/fee-balance';
import { useSettings } from '@/shared/SettingsContext';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';

type LedgerTab = 'ledger' | 'overview' | 'payments' | 'receipts' | 'history';

interface FeeRecord {
  id: number;
  month: number | string;
  fee_type?: string;
  amount_due?: number | string;
  amount_paid?: number | string;
  due_date?: string;
  status?: string;
  calculated_late_fee?: number | string;
}

interface StudentLedgerViewProps {
  studentId: number;
}

function getBalance(fee: Pick<FeeRecord, 'amount_due' | 'amount_paid'>) {
  return Math.max(
    0,
    parseFloat(String(fee.amount_due || 0)) - parseFloat(String(fee.amount_paid || 0)),
  );
}

function formatDueDate(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMonthHeading(monthName: string, academicYear: string, calendarMonth: number) {
  try {
    const parsed = parseAcademicYear(academicYear);
    const year = calendarYearForMonth(parsed, calendarMonth);
    return `${monthName} ${year}`;
  } catch {
    return monthName;
  }
}

function feeItemStatus(fee: FeeRecord, isPastOrCurrent: boolean) {
  const balance = getBalance(fee);
  if (balance <= 0) return 'Paid';
  const paid = parseFloat(String(fee.amount_paid || 0));
  if (isPastOrCurrent) return paid > 0 ? 'Partial' : 'Overdue';
  return paid > 0 ? 'Partial' : 'Pending';
}

function monthRowStatus(row: {
  hasFees: boolean;
  totalBalance: number;
  totalPaid: number;
  isPastOrCurrent: boolean;
}) {
  if (!row.hasFees) return row.isPastOrCurrent ? 'No fees' : 'Upcoming';
  if (row.totalBalance <= 0) return 'Paid';
  if (row.isPastOrCurrent) return row.totalPaid > 0 ? 'Partial' : 'Overdue';
  return row.totalPaid > 0 ? 'Partial' : 'Pending';
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'Paid':
      return 'bg-green-100 text-green-700';
    case 'Partial':
      return 'bg-blue-100 text-blue-700';
    case 'Overdue':
      return 'bg-red-100 text-red-700';
    case 'Pending':
      return 'bg-amber-100 text-amber-800';
    case 'Upcoming':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export default function StudentLedgerView({ studentId }: StudentLedgerViewProps) {
  const { settings } = useSettings();
  const { alert, confirm } = useDialog();
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [transportInfo, setTransportInfo] = useState<Record<string, unknown> | null>(null);
  const [academicYears, setAcademicYears] = useState<{ name: string; is_active?: boolean }[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LedgerTab>('ledger');
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const [showPayment, setShowPayment] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [selectedFeeIds, setSelectedFeeIds] = useState<Set<number>>(new Set());
  const [exemptLateFees, setExemptLateFees] = useState(false);
  const [exemptingFeeId, setExemptingFeeId] = useState<number | null>(null);
  const [exemptingAll, setExemptingAll] = useState(false);
  const [paymentMonth, setPaymentMonth] = useState<number | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Record<string, unknown> | null>(null);
  const [receiptStudent, setReceiptStudent] = useState<Record<string, unknown> | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<number | string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const defaultYear = settings.academic_year || '';
  const academicYear = selectedYear || defaultYear;

  useEffect(() => {
    fetch('/api/academic-years')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAcademicYears(d.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedYear && defaultYear) setSelectedYear(defaultYear);
  }, [defaultYear, selectedYear]);

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
        setTransportInfo(feesData.transport_info || feesData.transport || null);
      }
      if (paymentsData.success) setPayments(paymentsData.data);
    } finally {
      setLoading(false);
    }
  }, [studentId, academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setExpandedMonths(new Set());
    setMonthFilter('');
    setSelectedFeeIds(new Set());
    setExemptLateFees(false);
  }, [studentId, academicYear]);

  const openReceipt = useCallback(
    async (payment: Record<string, unknown>) => {
      if (!payment.id) return;
      setReceiptLoadingId(payment.id as number | string);
      try {
        const { payment: enrichedPayment, student: enrichedStudent } = await loadPaymentReceipt(
          payment.id as number | string,
        );
        setSelectedPayment(enrichedPayment);
        setReceiptStudent(enrichedStudent);
        setShowReceipt(true);
      } catch (error) {
        await alert(error instanceof Error ? error.message : 'Failed to load receipt', {
          title: 'Error',
          type: 'error',
        });
      } finally {
        setReceiptLoadingId(null);
      }
    },
    [alert],
  );

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
        monthLabel: formatMonthHeading(monthName, academicYear, calendarMonth),
        monthFees,
        totalDue,
        totalPaid,
        totalBalance,
        isPastOrCurrent: isCalendarMonthOnOrBefore(calendarMonth, currentCalendarMonth),
        hasFees: monthFees.length > 0,
      };
    });
  }, [fees, currentCalendarMonth, academicYear]);

  const totalDue = fees.reduce((s, f) => s + parseFloat(String(f.amount_due || 0)), 0);
  const totalPaidAmount = fees.reduce((s, f) => s + parseFloat(String(f.amount_paid || 0)), 0);
  const totalBalance = fees.reduce((s, f) => s + getBalance(f), 0);
  const overdueBalance = monthlyRows
    .filter((r) => r.isPastOrCurrent && r.totalBalance > 0)
    .reduce((s, r) => s + r.totalBalance, 0);

  const ledgerRows = useMemo(() => {
    const base = monthlyRows.filter((row) => row.hasFees || row.isPastOrCurrent);
    if (!monthFilter) return base;
    const monthNum = parseInt(monthFilter, 10);
    return base.filter((row) => row.monthIndex === monthNum);
  }, [monthlyRows, monthFilter]);

  const transactionHistory = useMemo(() => {
    return [...payments]
      .sort((a, b) => {
        const da = new Date(String(a.payment_date || 0)).getTime();
        const db = new Date(String(b.payment_date || 0)).getTime();
        return db - da;
      })
      .map((p) => ({
        id: p.id,
        date: p.payment_date,
        label: String(p.receipt_number || `Payment #${p.id}`),
        method: String(p.payment_method || '—').toUpperCase(),
        amount: parseFloat(String(p.amount_paid || 0)),
        type: 'payment' as const,
      }));
  }, [payments]);

  const tabs: { id: LedgerTab; label: string }[] = [
    { id: 'ledger', label: 'Ledger' },
    { id: 'overview', label: 'Overview' },
    { id: 'payments', label: 'Payments' },
    { id: 'receipts', label: 'Receipts' },
    { id: 'history', label: 'Transaction History' },
  ];

  const openCollectPayment = (calendarMonth: number | null = null) => {
    setPaymentMonth(calendarMonth);
    setShowPayment(true);
  };

  const payableFees = useMemo(
    () => fees.filter((fee) => getBalance(fee) > 0 && fee.status !== 'exempted'),
    [fees],
  );

  const selectedFees = useMemo(
    () => payableFees.filter((fee) => selectedFeeIds.has(fee.id)) as LedgerPayableFee[],
    [payableFees, selectedFeeIds],
  );

  const selectedLateFees = useMemo(
    () => selectedFees.reduce((sum, fee) => sum + getFeeLateFeeOutstanding(fee), 0),
    [selectedFees],
  );

  const selectedTotal = useMemo(() => {
    const gross = selectedFees.reduce((sum, fee) => sum + getFeeOutstanding(fee), 0);
    return exemptLateFees ? Math.max(0, gross - selectedLateFees) : gross;
  }, [selectedFees, exemptLateFees, selectedLateFees]);

  const selectorRows = useMemo(
    () => monthlyRows.filter((row) => row.hasFees || row.isPastOrCurrent),
    [monthlyRows],
  );

  const selectedMonthCount = useMemo(
    () => countSelectedMonths(selectorRows, selectedFeeIds),
    [selectorRows, selectedFeeIds],
  );

  const hasTransport = useMemo(
    () => Boolean(transportInfo) || fees.some((fee) => isTransportFee(fee)),
    [transportInfo, fees],
  );

  const clearFeeSelection = () => {
    setSelectedFeeIds(new Set());
    setExemptLateFees(false);
  };

  const handleExemptFee = async (fee: LedgerMonthFeeRecord, monthLabel: string) => {
    const feeLabel = fee.fee_type || 'fee';
    const studentName = `${String(student?.first_name || '')} ${String(student?.last_name || '')}`.trim();
    const confirmed = await confirm(
      `Exempt ${feeLabel} for ${monthLabel}?\n\nThis will waive the fee for ${studentName || 'this student'}.`,
      { title: 'Exempt Fee', type: 'warning', confirmText: 'Exempt' },
    );
    if (!confirmed) return;

    setExemptingFeeId(fee.id);
    try {
      const response = await fetch('/api/fees/exempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          student_fee_id: fee.id,
          exemption_reason: `${feeLabel} exempted by admin`,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSelectedFeeIds((prev) => {
          const next = new Set(prev);
          next.delete(fee.id);
          return next;
        });
        await alert(`${feeLabel} for ${monthLabel} has been exempted.`, {
          title: 'Success',
          type: 'success',
        });
        load();
      } else {
        await alert(data.error || 'Failed to exempt fee', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('An error occurred while exempting the fee.', { title: 'Error', type: 'error' });
    } finally {
      setExemptingFeeId(null);
    }
  };

  const handleExemptAllFees = async () => {
    const studentName = `${String(student?.first_name || '')} ${String(student?.last_name || '')}`.trim();
    const confirmed = await confirm(
      `Exempt all pending fees for ${studentName || 'this student'}?\n\nThis will waive tuition, transport, and other fees for the entire academic year.`,
      { title: 'Exempt All Fees', type: 'danger', confirmText: 'Exempt All' },
    );
    if (!confirmed) return;

    setExemptingAll(true);
    try {
      const response = await fetch('/api/fees/exempt-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          academic_year: academicYear,
          exemption_reason: 'All fees exempted by admin',
        }),
      });
      const data = await response.json();
      if (data.success) {
        clearFeeSelection();
        await alert(`All fees for ${studentName || 'this student'} have been exempted.`, {
          title: 'Success',
          type: 'success',
        });
        load();
      } else {
        await alert(data.error || 'Failed to exempt all fees', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('An error occurred while exempting fees.', { title: 'Error', type: 'error' });
    } finally {
      setExemptingAll(false);
    }
  };

  const openPaymentDetails = () => {
    if (selectedFees.length === 0) return;
    setShowPaymentDetails(true);
  };

  const payMonthFees = (monthFees: FeeRecord[]) => {
    const ids = monthFees.filter((f) => getBalance(f) > 0 && f.status !== 'exempted').map((f) => f.id);
    if (ids.length === 0) return;
    setSelectedFeeIds(new Set(ids));
    setActiveTab('overview');
    setShowPaymentDetails(true);
  };

  const toggleMonth = (monthIndex: number) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthIndex)) next.delete(monthIndex);
      else next.add(monthIndex);
      return next;
    });
  };

  const classSectionLabel = [
    student?.class_name ? String(student.class_name) : '',
    student?.section_name ? String(student.section_name) : '',
  ]
    .filter(Boolean)
    .join(' – ');

  if (loading && !student) {
    return <div className="py-20 text-center text-gray-500">Loading ledger...</div>;
  }

  if (!student) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-600">Student not found</p>
        <Link href="/fees/ledger" className="text-primary-600 text-sm mt-2 inline-block hover:underline">
          Back to Students
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 print:space-y-3" id="student-ledger-print">
      <header className="print:hidden">
        <Link
          href="/fees/ledger"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3"
        >
          <FiArrowLeft size={14} />
          Back to Students
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl text-gray-900">
              {String(student.first_name)} {String(student.last_name)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {String(student.admission_number)}
              {classSectionLabel ? ` · ${classSectionLabel}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openCollectPayment()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              <FiPlus size={16} />
              Collect Fee
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                aria-label="More actions"
              >
                <FiMoreVertical size={18} />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-sm">
                    <Link
                      href={`/students/${studentId}`}
                      className="block px-3 py-2 text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      View student profile
                    </Link>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setMenuOpen(false);
                        load();
                      }}
                    >
                      Refresh ledger
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
        <SummaryCard
          label="Total Due"
          value={formatFeeCurrency(totalDue)}
          icon={<RupeeIcon size={18} />}
          iconBg="bg-blue-100 text-blue-600"
        />
        <SummaryCard
          label="Total Paid"
          value={formatFeeCurrency(totalPaidAmount)}
          icon={<FiCheckCircle size={18} />}
          iconBg="bg-green-100 text-green-600"
          valueClass="text-green-700"
        />
        <SummaryCard
          label="Outstanding"
          value={formatFeeCurrency(totalBalance)}
          icon={<FiAlertCircle size={18} />}
          iconBg="bg-red-100 text-red-600"
          valueClass="text-red-700"
        />
        <SummaryCard
          label="Overdue"
          value={formatFeeCurrency(overdueBalance)}
          icon={<FiClock size={18} />}
          iconBg="bg-orange-100 text-orange-600"
          valueClass="text-orange-700"
        />
      </div>

      <div className="border-b border-gray-200 print:hidden">
        <nav className="flex flex-wrap gap-1 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Academic Year</span>
                <select
                  value={academicYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 min-w-[120px]"
                >
                  {academicYears.length > 0 ? (
                    academicYears.map((y) => (
                      <option key={y.name} value={y.name}>
                        {y.name}
                      </option>
                    ))
                  ) : (
                    <option value={academicYear}>{academicYear || 'Current'}</option>
                  )}
                </select>
              </label>
            </div>
            {transportInfo && (
              <p className="text-sm text-blue-700">
                Transport: {String(transportInfo.route_name)}
                {transportInfo.stop_name ? ` · ${String(transportInfo.stop_name)}` : ''}
              </p>
            )}
          </div>

          {selectorRows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              No fee records found for this academic year.
            </p>
          ) : (
            <>
              <LedgerMonthFeeSelector
                rows={selectorRows}
                hasTransport={hasTransport}
                selectedFeeIds={selectedFeeIds}
                onSelectionChange={setSelectedFeeIds}
                onExemptFee={handleExemptFee}
                onExemptAll={handleExemptAllFees}
                exemptingFeeId={exemptingFeeId}
                exemptingAll={exemptingAll}
              />

              {selectedFees.length > 0 && (
                <div className="mx-4 mt-2 mb-4 rounded-xl border border-primary-200 bg-primary-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedMonthCount} month{selectedMonthCount === 1 ? '' : 's'} ·{' '}
                      {selectedFees.length} fee{selectedFees.length === 1 ? '' : 's'} selected
                    </p>
                    <button
                      type="button"
                      onClick={clearFeeSelection}
                      className="text-sm font-medium text-primary-700 hover:text-primary-800"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                      <div className="bg-white rounded-lg border border-primary-100 px-4 py-3 min-w-[160px]">
                        <p className="text-xs text-gray-500">Total Amount</p>
                        <p className="text-xl text-primary-700">
                          {formatFeeCurrency(selectedTotal)}
                        </p>
                      </div>
                      {selectedLateFees > 0 && (
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exemptLateFees}
                            onChange={(e) => setExemptLateFees(e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          Exempt late fees ({formatFeeCurrency(selectedLateFees)})
                        </label>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={openPaymentDetails}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                    >
                      Confirm and Pay
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Academic Year</span>
                <select
                  value={academicYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 min-w-[120px]"
                >
                  {academicYears.length > 0 ? (
                    academicYears.map((y) => (
                      <option key={y.name} value={y.name}>
                        {y.name}
                      </option>
                    ))
                  ) : (
                    <option value={academicYear}>{academicYear || 'Current'}</option>
                  )}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                <FiDownload size={14} />
                Download Statement
              </button>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 min-w-[130px]"
                aria-label="Filter by month"
              >
                <option value="">All Months</option>
                {monthlyRows
                  .filter((r) => r.hasFees)
                  .map((r) => (
                    <option key={r.monthIndex} value={String(r.monthIndex)}>
                      {r.monthLabel}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {ledgerRows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              No fee records found for this academic year.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 text-left font-semibold">Month</th>
                    <th className="px-4 py-3 text-right font-semibold">Due Amount</th>
                    <th className="px-4 py-3 text-right font-semibold">Paid Amount</th>
                    <th className="px-4 py-3 text-right font-semibold">Balance</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((row) => {
                    const isExpanded = expandedMonths.has(row.monthIndex);
                    const status = monthRowStatus(row);

                    return (
                      <Fragment key={row.monthIndex}>
                        <tr className="border-b border-gray-100 hover:bg-gray-50/80">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => toggleMonth(row.monthIndex)}
                              className="inline-flex items-center gap-2 font-medium text-gray-900 text-left"
                            >
                              {isExpanded ? (
                                <FiChevronDown className="text-gray-400 shrink-0" size={16} />
                              ) : (
                                <FiChevronRight className="text-gray-400 shrink-0" size={16} />
                              )}
                              {row.monthLabel}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            {formatFeeCurrency(row.totalDue)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-700">
                            {formatFeeCurrency(row.totalPaid)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right ${
                              row.totalBalance > 0 ? 'text-red-700 font-semibold' : 'text-gray-900'
                            }`}
                          >
                            {formatFeeCurrency(row.totalBalance)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${statusBadgeClass(status)}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right print:hidden">
                            <div className="inline-flex items-center gap-1">
                              {row.totalBalance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => payMonthFees(row.monthFees)}
                                  className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                  Pay Now
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleMonth(row.monthIndex)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                                aria-label={isExpanded ? 'Collapse month' : 'Expand month'}
                              >
                                <FiMoreVertical size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            <td colSpan={6} className="px-4 py-3">
                              {row.monthFees.length === 0 ? (
                                <p className="text-sm text-gray-400 italic py-2">
                                  No fees assigned for this month.
                                </p>
                              ) : (
                                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-100 text-xs text-gray-500">
                                        <th className="px-4 py-2.5 text-left font-medium">Fee Item</th>
                                        <th className="px-4 py-2.5 text-left font-medium">Due Date</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Due Amount</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Paid Amount</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Balance</th>
                                        <th className="px-4 py-2.5 text-left font-medium">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.monthFees.map((fee) => {
                                        const itemStatus = feeItemStatus(fee, row.isPastOrCurrent);
                                        const balance = getBalance(fee);
                                        return (
                                          <tr key={fee.id} className="border-b border-gray-50 last:border-0">
                                            <td className="px-4 py-2.5 text-gray-900 italic">
                                              {fee.fee_type || 'Fee'}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-600 italic">
                                              <span className="inline-flex items-center gap-1.5">
                                                <FiCalendar className="text-gray-400" size={13} />
                                                {formatDueDate(fee.due_date)}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-gray-900 italic">
                                              {formatFeeCurrency(fee.amount_due)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-green-700 italic">
                                              {formatFeeCurrency(fee.amount_paid)}
                                            </td>
                                            <td
                                              className={`px-4 py-2.5 text-right italic ${
                                                balance > 0 ? 'text-red-700 font-medium' : 'text-gray-900'
                                              }`}
                                            >
                                              {formatFeeCurrency(balance)}
                                            </td>
                                            <td className="px-4 py-2.5 italic">
                                              <span
                                                className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadgeClass(itemStatus)}`}
                                              >
                                                {itemStatus}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-gray-50 border-t border-gray-200 font-semibold text-gray-900">
                                        <td className="px-4 py-2.5" colSpan={2}>
                                          {row.monthName} Total
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                          {formatFeeCurrency(row.totalDue)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-green-700">
                                          {formatFeeCurrency(row.totalPaid)}
                                        </td>
                                        <td
                                          className={`px-4 py-2.5 text-right ${
                                            row.totalBalance > 0 ? 'text-red-700' : ''
                                          }`}
                                        >
                                          {formatFeeCurrency(row.totalBalance)}
                                        </td>
                                        <td />
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
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
          )}
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
                  disabled={receiptLoadingId === p.id}
                  onClick={() => openReceipt(p)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                >
                  <FiPrinter size={14} />
                  {receiptLoadingId === p.id ? 'Loading...' : 'View'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {transactionHistory.length === 0 ? (
            <p className="p-8 text-center text-gray-500 text-sm">No transactions recorded</p>
          ) : (
            transactionHistory.map((tx) => (
              <div key={String(tx.id)} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{tx.label}</p>
                  <p className="text-gray-500">
                    {tx.date ? new Date(String(tx.date)).toLocaleDateString() : '—'} · {tx.method}
                  </p>
                </div>
                <span className="font-semibold text-green-700">{formatFeeCurrency(tx.amount)}</span>
              </div>
            ))
          )}
        </div>
      )}

      <LedgerPaymentDetailsModal
        isOpen={showPaymentDetails}
        onClose={() => setShowPaymentDetails(false)}
        onSuccess={() => {
          setShowPaymentDetails(false);
          clearFeeSelection();
          load();
        }}
        student={student}
        selectedFees={selectedFees}
        academicYear={academicYear}
        exemptLateFees={exemptLateFees}
        onExemptLateFeesChange={setExemptLateFees}
      />

      <RecordPaymentModal
        isOpen={showPayment}
        onClose={() => {
          setShowPayment(false);
          setPaymentMonth(null);
        }}
        onSuccess={() => {
          setShowPayment(false);
          setPaymentMonth(null);
          load();
        }}
        selectedStudent={student}
        initialCalendarMonth={paymentMonth}
      />

      {showReceipt && selectedPayment && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            setSelectedPayment(null);
            setReceiptStudent(null);
          }}
          payment={selectedPayment}
          student={
            receiptStudent || {
              first_name: student.first_name,
              last_name: student.last_name,
              admission_number: student.admission_number,
              class_name: student.class_name,
              section_name: student.section_name,
              parent_name: student.parent_name,
              parent_phone: student.parent_phone,
              mother_name: student.mother_name,
              address: student.address,
              city: student.city,
              state: student.state,
            }
          }
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  iconBg,
  valueClass = 'text-gray-900',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className={`text-lg mt-0.5 truncate ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}
