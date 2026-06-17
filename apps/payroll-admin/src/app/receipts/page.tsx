'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiCreditCard, FiFileText, FiPrinter, FiSearch } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';
import { useFeesStats } from '@/features/fees/hooks/useFeesStats';
import { useFeesStudents } from '@/features/fees/hooks/useFeesStudents';
import { useClassSectionOptions } from '@/features/fees/hooks/useClassSectionOptions';
import { useSettings } from '@/shared/SettingsContext';
import ReceiptModal from '@/features/fees/components/ReceiptModal';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import FeesClassSectionFilters from '@/features/fees/components/FeesClassSectionFilters';
import { buildFeeReceiptLineItems } from '@/features/fees/utils/fee-receipt-print';
import { formatFeeCurrency, getPaymentMethodBadgeClass } from '@/features/fees/utils/fees-format';
import { matchesClassSection, matchesStudentSearch } from '@/features/fees/utils/student-filters';

export default function FeesReceiptsPage() {
  return (
    <Suspense
      fallback={<p className="p-8 text-center text-gray-500 text-sm">Loading receipts...</p>}
    >
      <FeesReceiptsPageContent />
    </Suspense>
  );
}

function FeesReceiptsPageContent() {
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const { alert } = useDialog();
  const { stats, loading } = useFeesStats(settings.academic_year);
  const { students } = useFeesStudents(settings.academic_year);
  const [search, setSearch] = useState('');
  const {
    classes,
    sections,
    classId,
    sectionId,
    setClassId,
    setSectionId,
    loadingSections,
    hasActiveFilters,
  } = useClassSectionOptions();
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Record<string, unknown> | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Record<string, unknown> | null>(null);
  const [receiptDescriptions, setReceiptDescriptions] = useState<Record<string, string>>({});
  const [autoOpenedReceiptId, setAutoOpenedReceiptId] = useState<string | null>(null);

  const studentById = useMemo(() => {
    const map = new Map<number, (typeof students)[number]>();
    for (const student of students) {
      map.set(student.id, student);
    }
    return map;
  }, [students]);

  const payments = (stats?.recent_payments || []) as Array<Record<string, unknown>>;

  useEffect(() => {
    let cancelled = false;

    async function loadDescriptions() {
      const missing = payments.filter(
        (p) => p.id && !receiptDescriptions[String(p.id)],
      );
      if (!missing.length) return;

      const updates: Record<string, string> = {};
      await Promise.all(
        missing.map(async (payment) => {
          try {
            const res = await fetch(`/api/fees/receipt/${payment.id}`);
            const data = await res.json();
            if (!data?.success) return;
            const lines = buildFeeReceiptLineItems(data.data.payment || {});
            if (lines.length) {
              updates[String(payment.id)] = lines.map((line) => line.label).join(' | ');
            }
          } catch {
            // Keep silent: list should still render even if description fetch fails.
          }
        }),
      );

      if (!cancelled && Object.keys(updates).length) {
        setReceiptDescriptions((prev) => ({ ...prev, ...updates }));
      }
    }

    loadDescriptions();
    return () => {
      cancelled = true;
    };
  }, [payments, receiptDescriptions]);

  useEffect(() => {
    const paymentId = searchParams.get('payment_id');
    if (!paymentId || autoOpenedReceiptId === paymentId) return;
    const targetPayment = payments.find((payment) => String(payment.id) === paymentId);
    if (!targetPayment) return;
    setAutoOpenedReceiptId(paymentId);
    void openReceipt(targetPayment, 'original');
  }, [autoOpenedReceiptId, payments, searchParams]);

  const filtered = useMemo(() => {
    return payments.filter((payment) => {
      const student = studentById.get(Number(payment.student_id));
      const studentForFilter = student || {
        class_id: null,
        section_id: null,
        first_name: String(payment.first_name || ''),
        last_name: String(payment.last_name || ''),
        admission_number: String(payment.admission_number || ''),
        class_name: String(payment.class_name || ''),
        section_name: '',
        id: Number(payment.student_id),
      };

      if (!matchesClassSection(studentForFilter, { classId, sectionId })) return false;

      if (!search.trim()) return true;

      const receiptMatch = String(payment.receipt_number || '').toLowerCase().includes(search.toLowerCase());
      if (receiptMatch) return true;

      if (student) {
        return matchesStudentSearch(student, search);
      }

      const q = search.toLowerCase();
      return (
        String(payment.admission_number).toLowerCase().includes(q) ||
        `${payment.first_name} ${payment.last_name}`.toLowerCase().includes(q) ||
        String(payment.class_name || '').toLowerCase().includes(q)
      );
    });
  }, [payments, search, classId, sectionId, studentById]);

  const openReceipt = async (
    payment: Record<string, unknown>,
    type: 'original' | 'complete' | 'tuition-only',
  ) => {
    try {
      // Always start from original receipt payload since it has the most reliable month/type breakdown
      const response = await fetch(`/api/fees/receipt/${payment.id}`);
      const data = await response.json();
      if (data.success) {
        const basePayment = data.data.payment as Record<string, unknown>;
        const baseStudent = data.data.student as Record<string, unknown>;
        let finalPayment = basePayment;

        if (type === 'complete') {
          finalPayment = {
            ...basePayment,
            // Keep original receipt number so this matches collect-flow receipt identity
            receipt_number: basePayment.receipt_number,
            is_complete_receipt: true,
          };
        } else if (type === 'tuition-only') {
          const feeBreakdown = Array.isArray(basePayment.fee_breakdown)
            ? (basePayment.fee_breakdown as Array<Record<string, unknown>>)
            : [];
          const tuitionOnly = feeBreakdown.filter((fee) =>
            String(fee.fee_type || '').toLowerCase().includes('tuition'),
          );

          if (tuitionOnly.length > 0) {
            const tuitionAmount = tuitionOnly.reduce(
              (sum, fee) => sum + (parseFloat(String(fee.amount || 0)) || 0),
              0,
            );
            finalPayment = {
              ...basePayment,
              receipt_number: `${String(basePayment.receipt_number || '')}-TUITION`,
              fee_breakdown: tuitionOnly,
              amount_paid: tuitionAmount,
              late_fee_charged: 0,
              discount_applied: 0,
              is_tuition_only: true,
              months_paid: tuitionOnly.length,
            };
          } else {
            finalPayment = {
              ...basePayment,
              receipt_number: `${String(basePayment.receipt_number || '')}-TUITION`,
              is_tuition_only: true,
            };
          }
        }

        setSelectedPayment(finalPayment);
        setSelectedStudent(baseStudent);
        setShowReceipt(true);
      } else {
        await alert(data.error || 'Failed to load receipt', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Error loading receipt', { title: 'Error', type: 'error' });
    }
  };

  return (
    <div className="p-6 space-y-4">
      <FeesPageHeader
        title="Receipts"
        description="Print original, complete, or tuition-only receipts for recent payments."
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, class, section, or receipt no..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <FeesClassSectionFilters
          classes={classes}
          sections={sections}
          classId={classId}
          sectionId={sectionId}
          onClassChange={setClassId}
          onSectionChange={setSectionId}
          loadingSections={loadingSections}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y">
        {loading ? (
          <p className="p-8 text-center text-gray-500 text-sm">Loading receipts...</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-gray-500 text-sm">
            {search || hasActiveFilters ? 'No matching receipts' : 'No payments found'}
          </p>
        ) : (
          filtered.map((payment) => {
            const student = studentById.get(Number(payment.student_id));
            return (
              <div
                key={String(payment.id)}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {String(payment.first_name)} {String(payment.last_name)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {String(payment.admission_number)} · {String(payment.receipt_number)}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {receiptDescriptions[String(payment.id)] || String(payment.fee_type || 'Fee Payment')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {student?.class_name || payment.class_name || '—'}
                    {student?.section_name ? ` · ${student.section_name}` : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getPaymentMethodBadgeClass(String(payment.payment_method))}`}
                    >
                      {String(payment.payment_method).toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {payment.payment_date
                        ? new Date(String(payment.payment_date)).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-green-700">
                    {formatFeeCurrency(payment.amount_paid as number)}
                  </span>
                  <div className="flex gap-1">
                    <ReceiptBtn
                      icon={FiPrinter}
                      title="Original Receipt"
                      onClick={() => openReceipt(payment, 'original')}
                    />
                    <ReceiptBtn
                      icon={FiFileText}
                      title="Complete Receipt"
                      onClick={() => openReceipt(payment, 'complete')}
                    />
                    <ReceiptBtn
                      icon={FiCreditCard}
                      title="Tuition Receipt"
                      onClick={() => openReceipt(payment, 'tuition-only')}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showReceipt && selectedPayment && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            setSelectedPayment(null);
            setSelectedStudent(null);
          }}
          payment={selectedPayment}
          student={
            selectedStudent || {
              first_name: selectedPayment.first_name,
              last_name: selectedPayment.last_name,
              admission_number: selectedPayment.admission_number,
            }
          }
        />
      )}
    </div>
  );
}

function ReceiptBtn({
  icon: Icon,
  title,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
      aria-label={title}
    >
      <Icon size={16} />
    </button>
  );
}
