'use client';

import { useEffect, useMemo, useState } from 'react';
import AppModal, {
  APP_MODAL_BODY,
  APP_MODAL_FOOTER,
  APP_MODAL_HEADER,
  APP_MODAL_PANEL_STRUCTURED,
} from '@/shared/components/common/AppModal';
import { FiCheckCircle, FiCreditCard, FiInfo, FiX } from 'react-icons/fi';
import ReceiptModal from '@/features/fees/components/ReceiptModal';
import { useSettings } from '@/shared/SettingsContext';
import { getDefaultAcademicYearForDate } from '@/lib/fees/AcademicYear';
import {
  getFeeLateFeeOutstanding,
  getFeeOutstanding,
  getFeePrincipalBalance,
  type FeeBalanceRecord,
} from '@/features/fees/utils/fee-balance';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';

export type LedgerPayableFee = FeeBalanceRecord & {
  id: number;
  fee_type?: string;
};

type ModalStep = 'details' | 'review' | 'success';

interface LedgerPaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: Record<string, unknown>;
  selectedFees: LedgerPayableFee[];
  academicYear: string;
  exemptLateFees?: boolean;
  onExemptLateFeesChange?: (value: boolean) => void;
}

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500';

export default function LedgerPaymentDetailsModal({
  isOpen,
  onClose,
  onSuccess,
  student,
  selectedFees,
  academicYear,
  exemptLateFees: exemptLateFeesProp,
  onExemptLateFeesChange,
}: LedgerPaymentDetailsModalProps) {
  const { settings } = useSettings();
  const [step, setStep] = useState<ModalStep>('details');
  const [internalExemptLateFees, setInternalExemptLateFees] = useState(false);
  const exemptLateFees = exemptLateFeesProp ?? internalExemptLateFees;
  const setExemptLateFees = onExemptLateFeesChange ?? setInternalExemptLateFees;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedPayment, setSavedPayment] = useState<Record<string, unknown> | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    transaction_id: '',
    discount_applied: '0',
    remarks: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    setStep('details');
    if (exemptLateFeesProp === undefined) {
      setInternalExemptLateFees(false);
    }
    setError('');
    setSavedPayment(null);
    setForm({
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      transaction_id: '',
      discount_applied: '0',
      remarks: '',
    });
  }, [isOpen, selectedFees, exemptLateFeesProp]);

  const totals = useMemo(() => {
    const selectedPrincipal = selectedFees.reduce((sum, fee) => sum + getFeePrincipalBalance(fee), 0);
    const lateFees = exemptLateFees
      ? 0
      : selectedFees.reduce((sum, fee) => sum + getFeeLateFeeOutstanding(fee), 0);
    const discount = Math.max(0, parseFloat(form.discount_applied || '0') || 0);
    const totalPayable = Math.max(0, selectedPrincipal + lateFees - discount);
    return { selectedPrincipal, lateFees, discount, totalPayable };
  }, [selectedFees, exemptLateFees, form.discount_applied]);

  const studentLabel = `${String(student.first_name || '')} ${String(student.last_name || '')}`.trim();
  const studentMeta = [
    String(student.admission_number || ''),
    student.class_name ? String(student.class_name) : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  const submitPayment = async () => {
    setError('');
    setLoading(true);
    try {
      const studentFeeLateFees: Record<number, number> = {};
      if (!exemptLateFees) {
        selectedFees.forEach((fee) => {
          const late = getFeeLateFeeOutstanding(fee);
          if (late > 0) studentFeeLateFees[fee.id] = late;
        });
      }

      const baseRemarks = form.remarks.trim() || `Payment for ${selectedFees.length} fee(s)`;
      const payload = {
        student_id: Number(student.id),
        student_fee_ids: selectedFees.map((f) => f.id),
        fee_breakdown: [],
        total_amount_paid: totals.totalPayable,
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        transaction_id: form.transaction_id.trim() || null,
        remarks: exemptLateFees ? `${baseRemarks} (Late fees exempted by admin)` : baseRemarks,
        discount_applied: totals.discount,
        late_fee_charged: totals.lateFees,
        exempt_late_fees: exemptLateFees,
        student_fee_late_fees: studentFeeLateFees,
        academic_year: academicYear || settings.academic_year || getDefaultAcademicYearForDate().name,
        created_by: 1,
      };

      const response = await fetch('/api/fees/bulk-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to record payment');
        return;
      }

      setSavedPayment(data.data);
      setStep('success');
    } catch {
      setError('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const title =
    step === 'success'
      ? 'Payment Recorded'
      : step === 'review'
        ? 'Review & Confirm'
        : 'Payment Details';

  return (
    <>
      <AppModal open={isOpen} onClose={handleClose}>
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className={`${APP_MODAL_PANEL_STRUCTURED} relative z-10 w-full rounded-xl`}
            style={{ maxWidth: '42rem', maxHeight: '90vh' }}
          >
            <div className={APP_MODAL_HEADER}>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                {step === 'review' && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Review the summary and confirm to record the payment.
                  </p>
                )}
                {step === 'success' && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Payment is recorded successfully and receipt is generated.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className={`${APP_MODAL_BODY} px-4 sm:px-6 py-4 space-y-4 overflow-y-auto`}>
              {step === 'success' ? (
                <div className="py-6 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <FiCheckCircle className="text-green-600" size={32} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Payment Recorded Successfully!</p>
                    {savedPayment?.receipt_number && (
                      <p className="text-sm text-gray-600 mt-2">
                        Receipt No: <span className="font-medium">{String(savedPayment.receipt_number)}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : step === 'review' ? (
                <div className="rounded-xl border border-gray-200 p-4 space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Review Payment</h3>
                    <p className="text-sm font-medium text-gray-900 mt-2">{studentLabel}</p>
                    <p className="text-xs text-gray-500">{studentMeta}</p>
                  </div>
                  <PaymentSummary
                    feeCount={selectedFees.length}
                    selectedPrincipal={totals.selectedPrincipal}
                    lateFees={totals.lateFees}
                    discount={totals.discount}
                    totalPayable={totals.totalPayable}
                    exemptLateFees={exemptLateFees}
                    showExempt={false}
                  />
                  <div className="text-sm text-gray-600 space-y-1 border-t pt-3">
                    <p>
                      <span className="text-gray-500">Date:</span> {form.payment_date}
                    </p>
                    <p>
                      <span className="text-gray-500">Method:</span> {form.payment_method}
                    </p>
                    {form.transaction_id && (
                      <p>
                        <span className="text-gray-500">Transaction ID:</span> {form.transaction_id}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <PaymentSummary
                    feeCount={selectedFees.length}
                    selectedPrincipal={totals.selectedPrincipal}
                    lateFees={totals.lateFees}
                    discount={totals.discount}
                    totalPayable={totals.totalPayable}
                    exemptLateFees={exemptLateFees}
                    onExemptChange={setExemptLateFees}
                    showExempt
                  />

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Payment Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={form.payment_date}
                          onChange={(e) => setForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Payment Method <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={form.payment_method}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, payment_method: e.target.value }))
                          }
                          className={INPUT_CLASS}
                        >
                          <option value="cash">Cash</option>
                          <option value="online">Online</option>
                          <option value="cheque">Cheque</option>
                          <option value="card">Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Transaction ID
                        </label>
                        <input
                          type="text"
                          value={form.transaction_id}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, transaction_id: e.target.value }))
                          }
                          className={INPUT_CLASS}
                          placeholder="For online/card payments"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Discount Applied (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.discount_applied}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, discount_applied: e.target.value }))
                          }
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                        <textarea
                          value={form.remarks}
                          onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                          rows={2}
                          className={INPUT_CLASS}
                          placeholder="Optional notes..."
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className={APP_MODAL_FOOTER}>
              {step === 'success' ? (
                <>
                  <button
                    type="button"
                    onClick={handleDone}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReceipt(true)}
                    disabled={!savedPayment}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    View Receipt
                  </button>
                </>
              ) : step === 'review' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={submitPayment}
                    disabled={loading || totals.totalPayable <= 0}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    <FiCreditCard size={15} />
                    {loading ? 'Recording...' : 'Record Payment'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('review')}
                    disabled={totals.totalPayable <= 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    Review Payment ({formatFeeCurrency(totals.totalPayable)})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </AppModal>

      {showReceipt && savedPayment && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => setShowReceipt(false)}
          payment={savedPayment}
          student={{
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
          }}
        />
      )}
    </>
  );
}

function PaymentSummary({
  feeCount,
  selectedPrincipal,
  lateFees,
  discount,
  totalPayable,
  exemptLateFees,
  onExemptChange,
  showExempt,
}: {
  feeCount: number;
  selectedPrincipal: number;
  lateFees: number;
  discount: number;
  totalPayable: number;
  exemptLateFees: boolean;
  onExemptChange?: (value: boolean) => void;
  showExempt: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Payment Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-gray-600">Selected Fees ({feeCount})</span>
          <span className="font-medium text-gray-900">{formatFeeCurrency(selectedPrincipal)}</span>
        </div>
        <div className="flex justify-between gap-3 items-center">
          <span className="inline-flex items-center gap-1 text-gray-600">
            Late Fees
            <FiInfo size={13} className="text-gray-400" />
          </span>
          <span
            className={`font-medium ${exemptLateFees ? 'text-gray-400 line-through' : 'text-gray-900'}`}
          >
            {formatFeeCurrency(lateFees)}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-600">Discount</span>
            <span className="font-medium text-green-700">-{formatFeeCurrency(discount)}</span>
          </div>
        )}
      </div>
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500">Total Payable</p>
        <p className="text-xl text-primary-600">{formatFeeCurrency(totalPayable)}</p>
      </div>
      {showExempt && lateFees > 0 && onExemptChange && (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={exemptLateFees}
            onChange={(e) => onExemptChange(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Exempt late fees
        </label>
      )}
    </div>
  );
}
