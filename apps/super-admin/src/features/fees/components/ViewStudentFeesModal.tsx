'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FiX, FiFileText } from 'react-icons/fi';
import ReceiptModal from '@/features/fees/components/ReceiptModal';
import { ACADEMIC_MONTH_NAMES } from '@/shared/constants/constants';
import { useSettings } from '@/shared/SettingsContext';

interface ViewStudentFeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onRecordPayment: (fee: any) => void;
}

function getCurrentAcademicMonthIndex(): number {
  const calMonth = new Date().getMonth() + 1;
  return calMonth >= 4 ? calMonth - 3 : calMonth + 9;
}

export default function ViewStudentFeesModal({ isOpen, onClose, student, onRecordPayment }: ViewStudentFeesModalProps) {
  const { settings } = useSettings();

  const modalContentRef = useRef<HTMLDivElement>(null);

  const [fees, setFees] = useState<any[]>([]);
  const [transportInfo, setTransportInfo] = useState<{
    route_name: string;
    route_number: string | null;
    stop_name: string | null;
    transport_fee: number;
  } | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'monthly' | 'paid'>('monthly');
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const academicYear = settings.academic_year || '';

  const fetchStudentFees = useCallback(async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const yearParam = academicYear ? `&academic_year=${encodeURIComponent(academicYear)}` : '';
      const response = await fetch(`/api/fees/student-fees?student_id=${student.id}${yearParam}`);
      const data = await response.json();
      if (data.success) {
        setFees(data.data);
        setTransportInfo(data.transport || null);
      }
    } catch (error) {
      console.error('Error fetching student fees:', error);
    } finally {
      setLoading(false);
    }
  }, [student?.id, academicYear]);

  const fetchPaymentHistory = useCallback(async () => {
    if (!student?.id) return;
    try {
      const response = await fetch(`/api/fees?student_id=${student.id}`);
      const data = await response.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  }, [student?.id]);

  useEffect(() => {
    if (isOpen && student) {
      fetchStudentFees();
      fetchPaymentHistory();
    }
  }, [isOpen, student, fetchStudentFees, fetchPaymentHistory]);

  const handleViewReceipt = (payment: any) => {
    setSelectedPayment(payment);
    setShowReceipt(true);
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    if (isNaN(numAmount)) return '₹0.00';
    return `₹${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const getBalance = (fee: any) =>
    Math.max(0, parseFloat(fee.amount_due || 0) - parseFloat(fee.amount_paid || 0));

  const getLateFee = (fee: any) => parseFloat(fee.calculated_late_fee || 0);

  const currentAcademicMonth = getCurrentAcademicMonthIndex();

  const monthlyRows = useMemo(() => {
    return ACADEMIC_MONTH_NAMES.map((monthName, idx) => {
      const monthIndex = idx + 1;
      const monthFees = fees
        .filter((f) => parseInt(String(f.month), 10) === monthIndex)
        .sort((a, b) => {
          const aTransport = String(a.fee_type || '').toLowerCase().includes('transport');
          const bTransport = String(b.fee_type || '').toLowerCase().includes('transport');
          if (aTransport === bTransport) return 0;
          return aTransport ? 1 : -1;
        });
      const totalDue = monthFees.reduce((s, f) => s + parseFloat(f.amount_due || 0), 0);
      const totalPaid = monthFees.reduce((s, f) => s + parseFloat(f.amount_paid || 0), 0);
      const totalBalance = monthFees.reduce((s, f) => s + getBalance(f), 0);
      const totalLateFee = monthFees.reduce((s, f) => s + getLateFee(f), 0);
      const isPastOrCurrent = monthIndex <= currentAcademicMonth;

      return {
        monthIndex,
        monthName,
        monthFees,
        totalDue,
        totalPaid,
        totalBalance,
        totalLateFee,
        isPastOrCurrent,
        hasFees: monthFees.length > 0,
      };
    });
  }, [fees, currentAcademicMonth]);

  const pendingFees = fees.filter((f) => getBalance(f) > 0);
  const totalPending = pendingFees.reduce((sum, f) => sum + getBalance(f), 0);
  const totalLateFees = fees.reduce((sum, f) => sum + getLateFee(f), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);
  const hasLateFees = totalLateFees > 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div ref={modalContentRef} className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl overflow-hidden">
        <div className="px-4 py-2 sm:px-6 sm:py-3 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl text-gray-900">
              Fee Details - {student?.first_name} {student?.last_name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Admission No: {student?.admission_number}
              {academicYear && <span className="ml-2">· Academic Year: {academicYear}</span>}
            </p>
            {transportInfo && (
              <p className="text-sm text-blue-700 mt-1">
                Transport: {transportInfo.route_name}
                {transportInfo.route_number ? ` (${transportInfo.route_number})` : ''}
                {transportInfo.stop_name ? ` · Stop: ${transportInfo.stop_name}` : ''}
                {' · '}₹{transportInfo.transport_fee.toLocaleString('en-IN')}/month
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX size={28} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className={`grid grid-cols-1 gap-4 mb-6 ${hasLateFees ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <p className="text-sm font-medium text-red-600">Total Pending</p>
              <p className="text-xl text-red-700 mt-1">{formatCurrency(totalPending)}</p>
              <p className="text-xs text-red-600 mt-1">{pendingFees.length} unpaid fee record(s)</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <p className="text-sm font-medium text-green-600">Total Paid</p>
              <p className="text-xl text-green-700 mt-1">{formatCurrency(totalPaid)}</p>
            </div>
            {hasLateFees && (
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                <p className="text-sm font-medium text-orange-600">Late Fees (if applicable)</p>
                <p className="text-xl text-orange-700 mt-1">{formatCurrency(totalLateFees)}</p>
                <p className="text-xs text-orange-600 mt-1">Only charged when overdue past grace period</p>
              </div>
            )}
          </div>

          <div className="flex gap-4 border-b mb-4">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'monthly'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly Fees ({pendingFees.length} due)
            </button>
            <button
              onClick={() => setActiveTab('paid')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'paid'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Payment History ({payments.length})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              <p className="text-gray-500 mt-2">Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === 'monthly' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Month-by-month breakdown for the academic year (April → March). Late fees appear only when applicable.
                  </p>

                  {fees.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border">
                      <p className="text-lg">No fee records assigned</p>
                      <p className="text-sm mt-1">Assign fee structures to this student&apos;s class to generate monthly fees.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {monthlyRows
                        .filter((row) => row.hasFees || row.isPastOrCurrent)
                        .map((row) => (
                        <div
                          key={row.monthIndex}
                          className={`border rounded-xl overflow-hidden ${
                            row.hasFees && row.totalBalance > 0 && row.isPastOrCurrent
                              ? 'border-red-200'
                              : 'border-gray-200'
                          }`}
                        >
                          <div
                            className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b ${
                              row.hasFees && row.totalBalance > 0 && row.isPastOrCurrent
                                ? 'bg-red-50'
                                : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{row.monthName}</span>
                              {row.hasFees && row.totalBalance > 0 && row.isPastOrCurrent && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                                  Pending
                                </span>
                              )}
                              {row.hasFees && row.totalBalance === 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                                  Paid
                                </span>
                              )}
                            </div>
                            {row.hasFees && (
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                <span className="text-gray-600">
                                  Amount: {formatCurrency(row.totalDue)}
                                </span>
                                <span className="text-green-700">
                                  Paid: {formatCurrency(row.totalPaid)}
                                </span>
                                <span
                                  className={`font-medium ${
                                    row.totalBalance > 0 ? 'text-red-700' : 'text-gray-600'
                                  }`}
                                >
                                  Balance: {formatCurrency(row.totalBalance)}
                                </span>
                                {hasLateFees && row.totalLateFee > 0 && (
                                  <span className="text-orange-700">
                                    Late: {formatCurrency(row.totalLateFee)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {!row.hasFees ? (
                            <p className="px-4 py-3 text-sm text-gray-400 italic">
                              {row.isPastOrCurrent
                                ? 'No fee assigned for this month'
                                : 'Upcoming — not yet due'}
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-white border-b">
                                  <tr>
                                    <th className="text-left px-4 py-2 font-medium text-gray-700">Fee Type</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-700">Due Date</th>
                                    <th className="text-right px-4 py-2 font-medium text-gray-700">Amount</th>
                                    <th className="text-right px-4 py-2 font-medium text-gray-700">Paid</th>
                                    <th className="text-right px-4 py-2 font-medium text-gray-700">Balance</th>
                                    {hasLateFees && (
                                      <th className="text-right px-4 py-2 font-medium text-gray-700">Late Fee</th>
                                    )}
                                    <th className="text-left px-4 py-2 font-medium text-gray-700">Status</th>
                                    <th className="px-4 py-2" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.monthFees.map((fee) => {
                                    const balance = getBalance(fee);
                                    const lateFee = getLateFee(fee);

                                    return (
                                      <tr
                                        key={fee.id}
                                        className={`border-b last:border-b-0 hover:bg-gray-50 ${
                                          balance > 0 && row.isPastOrCurrent ? 'bg-red-50/20' : ''
                                        }`}
                                      >
                                        <td className="px-4 py-2.5 text-gray-800">{fee.fee_type || 'Fee'}</td>
                                        <td className="px-4 py-2.5 text-gray-600">
                                          {fee.due_date
                                            ? new Date(fee.due_date).toLocaleDateString()
                                            : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                          {formatCurrency(fee.amount_due)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-green-700">
                                          {formatCurrency(fee.amount_paid)}
                                        </td>
                                        <td
                                          className={`px-4 py-2.5 text-right font-medium ${
                                            balance > 0 ? 'text-red-700' : 'text-gray-600'
                                          }`}
                                        >
                                          {formatCurrency(balance)}
                                        </td>
                                        {hasLateFees && (
                                          <td className="px-4 py-2.5 text-right text-orange-700">
                                            {lateFee > 0 ? formatCurrency(lateFee) : '—'}
                                          </td>
                                        )}
                                        <td className="px-4 py-2.5">
                                          <span
                                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(fee.status)}`}
                                          >
                                            {fee.status?.toUpperCase() || 'PENDING'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                          {balance > 0 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                onRecordPayment(fee);
                                                onClose();
                                              }}
                                              className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700"
                                            >
                                              Pay
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-gray-50 px-4 py-3 text-sm font-medium">
                        <span className="text-gray-900">Year Total</span>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            Amount: {formatCurrency(monthlyRows.reduce((s, r) => s + r.totalDue, 0))}
                          </span>
                          <span className="text-green-700">
                            Paid: {formatCurrency(monthlyRows.reduce((s, r) => s + r.totalPaid, 0))}
                          </span>
                          <span className="text-red-700">
                            Balance: {formatCurrency(totalPending)}
                          </span>
                          {hasLateFees && (
                            <span className="text-orange-700">
                              Late: {formatCurrency(totalLateFees)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'paid' && (
                <div className="space-y-3">
                  {payments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                      <p className="text-lg">No payment history</p>
                      <p className="text-sm mt-1">No payments have been recorded yet</p>
                    </div>
                  ) : (
                    payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900 text-lg">
                                {payment.fee_type || 'Payment'}
                              </h4>
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                                COMPLETED
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Receipt No:</span>
                                <span className="text-primary-600 font-mono">{payment.receipt_number}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Payment Date:</span>
                                <span>{new Date(payment.payment_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Method:</span>
                                <span className="uppercase">{payment.payment_method}</span>
                              </div>
                              {payment.transaction_id && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Transaction ID:</span>
                                  <span className="font-mono text-xs">{payment.transaction_id}</span>
                                </div>
                              )}
                              {payment.remarks && (
                                <div className="flex items-start gap-2 mt-2">
                                  <span className="font-medium">Remarks:</span>
                                  <span className="text-gray-700">{payment.remarks}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-right">
                              <p className="text-xl text-green-600">
                                {formatCurrency(payment.amount_paid)}
                              </p>
                              {parseFloat(payment.discount_applied || 0) > 0 && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Discount: -{formatCurrency(payment.discount_applied)}
                                </p>
                              )}
                              {parseFloat(payment.late_fee_charged || 0) > 0 && (
                                <p className="text-sm text-red-600 mt-1">
                                  Late Fee: +{formatCurrency(payment.late_fee_charged)}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleViewReceipt(payment)}
                              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1 transition-colors text-sm font-medium shadow-sm"
                            >
                              <FiFileText size={14} />
                              View Receipt
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end p-4 sm:p-6 border-t sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {showReceipt && selectedPayment && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          student={student}
        />
      )}
    </AppModal>
  );
}
