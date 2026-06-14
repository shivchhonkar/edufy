'use client';

import React from 'react';
import { useSettings } from '@/shared/SettingsContext';

interface PrintableReceiptProps {
  payment: any;
  student: any;
}

export default function PrintableReceipt({ payment, student }: PrintableReceiptProps) {
  const { settings, formatCurrency: formatCurrencyFromSettings } = useSettings();

  const formatCurrency = (amount: number | string | null | undefined) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    if (isNaN(numAmount)) return '₹0.00';
    return `₹${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getFeeTypeDisplay = (feeType: string) => {
    const feeDisplayMap: { [key: string]: string } = {
      'Tuition Fee': 'Tuition Fee',
      'Transport Fee': 'Transport Fee',
      'Library Fee': 'Library Fee',
      'Laboratory Fee': 'Laboratory Fee',
      'Sports Fee': 'Sports Fee',
      'Examination Fee': 'Examination Fee',
      'Activity Fee': 'Activity Fee',
      'Late Fee': 'Late Fee',
      'Other Charges': 'Other Charges'
    };
    return feeDisplayMap[feeType] || feeType;
  };

  const getGrossAmount = () => {
    const amount = parseFloat(payment.amount_paid || 0);
    const discount = parseFloat(payment.discount_applied || 0);
    const lateFee = parseFloat(payment.late_fee_charged || 0);
    return amount + discount - lateFee;
  };

  return (
    <div id="receipt-content" className="bg-white p-6 max-w-3xl mx-auto" style={{ fontSize: '13px' }}>
      {/* School Header */}
      <div className="text-center border-b-2 border-primary-600 pb-3 mb-4">
        {settings.logo_url ? (
          <img
            src={settings.logo_url}
            alt={settings.school_name || 'School logo'}
            className="h-16 w-auto max-w-[180px] object-contain mx-auto mb-2"
          />
        ) : null}
        <h1 className="text-xl text-primary-600 tracking-wide uppercase">
          {settings.school_name || 'Shribi Edufy SCHOOL'}
        </h1>
        <p className="text-xs text-gray-600 mt-0.5">School Management System</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {settings.school_address || '123 Education Street, City - 123456'}
          {settings.school_phone && ` | Phone: ${settings.school_phone}`}
          {settings.school_email && ` | Email: ${settings.school_email}`}
        </p>
      </div>

      {/* Receipt Title */}
      <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded">
        <div>
          <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">
            {payment.is_tuition_only ? 'Tuition Fee Receipt (Tax Purpose)' : 
             payment.id === 'complete-summary' ? 'Complete Payment Summary' :
             'Fee Payment Receipt'}
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {payment.is_tuition_only ? 'Tuition fees only - For tax exemption purposes' :
             payment.id === 'complete-summary' ? 'Complete payment history summary' :
             'Computer Generated Receipt'}
          </p>
        </div>
        <div className="text-right">
          <div className="inline-block bg-green-600 px-3 py-1 rounded">
            <span className="text-white font-bold text-xs">PAID</span>
          </div>
        </div>
      </div>

      {/* Receipt Details Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4 border border-gray-200 rounded">
        <div className="p-2 border-r border-gray-200">
          <p className="text-xs text-gray-500 mb-0.5">Receipt No.</p>
          <p className="font-bold text-sm text-primary-600">{payment.receipt_number}</p>
        </div>
        <div className="p-2 border-r border-gray-200">
          <p className="text-xs text-gray-500 mb-0.5">Payment Date</p>
          <p className="font-semibold text-sm text-gray-900">{formatDate(payment.payment_date)}</p>
        </div>
        <div className="p-2 border-r border-gray-200">
          <p className="text-xs text-gray-500 mb-0.5">Payment Method</p>
          <p className="font-semibold text-sm text-gray-900 uppercase">{payment.payment_method}</p>
        </div>
        <div className="p-2">
          <p className="text-xs text-gray-500 mb-0.5">Academic Year</p>
          {console.log("settings", settings)}
          <p className="font-semibold text-sm text-gray-900">{settings.academic_year || 'N/A'}</p>
        </div>
      </div>

      {payment.transaction_id && (
        <div className="mb-4 bg-blue-50 border border-blue-200 p-2 rounded">
          <p className="text-xs text-gray-600">Transaction ID: <span className="font-mono font-semibold text-gray-900">{payment.transaction_id}</span></p>
        </div>
      )}

      {/* Student Details */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900 mb-2 bg-gray-100 px-3 py-1.5 rounded uppercase tracking-wide">Student Information</h3>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-3">
          <div>
            <p className="text-xs text-gray-500">Student Name</p>
            <p className="font-semibold text-sm text-gray-900">
              {student?.first_name} {student?.last_name}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Admission Number</p>
            <p className="font-semibold text-sm text-gray-900">{student?.admission_number}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Class / Section</p>
            <p className="font-semibold text-sm text-gray-900">
              {student?.class_name || 'N/A'} {student?.section_name ? `/ ${student.section_name}` : ''}
            </p>
          </div>
          {student?.parent_name && (
            <div>
              <p className="text-xs text-gray-500">Parent/Guardian</p>
              <p className="font-semibold text-sm text-gray-900">{student.parent_name}</p>
            </div>
          )}
          {student?.parent_phone && (
            <div>
              <p className="text-xs text-gray-500">Contact Number</p>
              <p className="font-semibold text-sm text-gray-900">{student.parent_phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900 mb-2 bg-gray-100 px-3 py-1.5 rounded uppercase tracking-wide">Payment Breakdown</h3>
        {payment.fee_breakdown && payment.fee_breakdown.length > 0 ? (
          // Multiple months breakdown - Group by month
          (() => {
            const monthGroups: { [key: string]: any[] } = {};
            payment.fee_breakdown.forEach((fee: any) => {
              const monthKey = fee.month ? `${fee.month}-${fee.year || new Date().getFullYear()}` : 'other';
              if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
              monthGroups[monthKey].push(fee);
            });

            return (
              <div className="space-y-4">
                {Object.entries(monthGroups).map(([monthKey, fees]) => {
                  const monthNumber = parseInt(monthKey.split('-')[0]);
                  const year = parseInt(monthKey.split('-')[1]);
                  const monthName = new Date(year, monthNumber - 1).toLocaleString('default', { month: 'long' });
                  const monthTotal = fees.reduce((sum, fee) => sum + (parseFloat(fee.amount) || 0) + (parseFloat(fee.late_fee) || 0), 0);

                  return (
                    <div key={monthKey} className="border border-gray-300 rounded">
                      <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                        <h4 className="font-bold text-sm text-gray-800 uppercase">
                          Month: {monthName}
                        </h4>
                      </div>
                      <div className="px-4 py-3">
                        <table className="w-full">
                          <tbody>
                            {fees.map((fee: any, index: number) => (
                              <tr key={index}>
                                <td className="py-1 text-sm text-gray-700 w-3/4">
                                  {getFeeTypeDisplay(fee.fee_type)}
                                  {fee.late_fee > 0 && (
                                    <span className="text-xs text-red-600 ml-2">(+Late Fee)</span>
                                  )}
                                </td>
                                <td className="py-1 text-right font-semibold text-sm text-gray-900 w-1/4">
                                  {formatCurrency((parseFloat(fee.amount) || 0) + (parseFloat(fee.late_fee) || 0))}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-gray-200">
                              <td className="py-2 text-sm font-bold text-gray-800">
                                Subtotal
                              </td>
                              <td className="py-2 text-right font-bold text-sm text-gray-900">
                                {formatCurrency(monthTotal)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
                
                {/* Grand Total */}
                <div className="bg-primary-50 border-2 border-primary-300 rounded p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-base text-gray-900 uppercase">Grand Total</span>
                    <span className="font-bold text-primary-700 text-lg">
                      {formatCurrency(payment.amount_paid)}
                    </span>
                  </div>
                  {payment.months_paid > 1 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Payment for {payment.months_paid} months • {payment.fee_breakdown.length} fees
                    </p>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          // Single payment
          <div className="border border-gray-200 rounded">
            <div className="bg-blue-50 px-3 py-2 border-b border-gray-200">
              <h4 className="font-bold text-sm text-blue-800">
                {payment.month ? 
                  `📅 ${new Date(2024, payment.month - 1).toLocaleString('default', { month: 'long' })} ${settings.academic_year || 'N/A'}` : 
                  '💳 Fee Payment'
                } - {formatCurrency(getGrossAmount())}
              </h4>
            </div>
            <div className="px-3 py-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {getFeeTypeDisplay(payment.fee_type) || 'Fee Payment'}
                </span>
                <span className="font-semibold text-sm text-gray-900">
                  {formatCurrency(getGrossAmount())}
                </span>
              </div>
              {parseFloat(payment.late_fee_charged || 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-red-600">⚡ Late Fee</span>
                  <span className="text-xs font-semibold text-red-600">
                    {formatCurrency(payment.late_fee_charged)}
                  </span>
                </div>
              )}
              {parseFloat(payment.discount_applied || 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-600">💰 Discount</span>
                  <span className="text-xs font-semibold text-green-600">
                    - {formatCurrency(payment.discount_applied)}
                  </span>
                </div>
              )}
            </div>
            <div className="bg-primary-50 border-t border-primary-200 px-3 py-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-gray-900 uppercase">Net Amount Paid</span>
                <span className="font-bold text-primary-700 text-base">
                  {formatCurrency(payment.amount_paid)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Summary Notice */}
      {payment.id === 'complete-summary' && payment.summary && (
        <div className="mb-3 bg-blue-50 border border-blue-300 p-2.5 rounded">
          <p className="text-xs font-semibold text-blue-900">
            📊 Complete Payment Summary: {payment.summary.payment_count} payments covering {payment.summary.month_breakdown.length} months
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>Tuition Fees: ₹{payment.summary.tuition_paid.toFixed(2)}</div>
            <div>Transport Fees: ₹{payment.summary.transport_paid.toFixed(2)}</div>
            <div>Other Fees: ₹{payment.summary.other_paid.toFixed(2)}</div>
            <div>Total Paid: ₹{payment.summary.total_paid.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Bulk Payment Notice */}
      {payment.months_paid && payment.months_paid > 1 && payment.id !== 'complete-summary' && (
        <div className="mb-3 bg-green-50 border border-green-300 p-2.5 rounded">
          <p className="text-xs font-semibold text-green-900">
            ✓ Bulk Payment: This receipt covers payment for {payment.months_paid} months
          </p>
        </div>
      )}

      {/* Tuition Only Notice */}
      {payment.is_tuition_only && (
        <div className="mb-3 bg-purple-50 border border-purple-300 p-2.5 rounded">
          <p className="text-xs font-semibold text-purple-900">
            🎓 Tuition Only Receipt: This receipt shows only tuition fees for tax exemption purposes
          </p>
        </div>
      )}

      {/* Amount in Words */}
      <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded border border-blue-200">
        <p className="text-xs text-gray-600 mb-0.5 font-medium">Amount in Words:</p>
        <p className="font-bold text-sm text-gray-900 italic">
          {numberToWords(parseFloat(payment.amount_paid || 0))} Rupees Only
        </p>
      </div>

      {/* Remarks */}
      {payment.remarks && (
        <div className="mb-4 bg-amber-50 border border-amber-200 p-2.5 rounded">
          <p className="text-xs text-gray-600 mb-0.5 font-medium">Remarks:</p>
          <p className="text-sm text-gray-800 italic">{payment.remarks}</p>
        </div>
      )}

      {/* Important Notes */}
      <div className="mb-4 bg-yellow-50 border border-yellow-300 p-2.5 rounded">
        <p className="text-xs font-semibold text-gray-900 mb-1">Important Notes:</p>
        <ul className="text-xs text-gray-700 space-y-0.5 list-disc list-inside">
          <li>This is a computer-generated receipt and is valid without signature</li>
          <li>Please preserve this receipt for future reference</li>
          <li>All payments are non-refundable except as per school policy</li>
        </ul>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-300">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-4">Received By:</p>
            <div className="border-t border-gray-400 pt-1.5">
              <p className="text-xs font-medium text-gray-900">Authorized Signatory</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-4">Verified By:</p>
            <div className="border-t border-gray-400 pt-1.5">
              <p className="text-xs font-medium text-gray-900">Accounts Department</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-4">Date:</p>
            <div className="border-t border-gray-400 pt-1.5">
              <p className="text-xs font-medium text-gray-900">{formatDate(new Date())}</p>
            </div>
          </div>
        </div>
      </div>

      {/* School Stamp Area */}
      <div className="mt-4 text-center">
        <div className="inline-block border-2 border-dashed border-gray-300 rounded-full px-6 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest">School Stamp</p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-dashed border-gray-300 text-center">
        <p className="text-xs text-gray-500">
          Generated on {new Date().toLocaleString('en-IN')} | For queries: {settings.school_email || 'accounts@Shribi Edufy.edu'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Thank you for your payment!</p>
      </div>
    </div>
  );
}

// Helper function to convert number to words
function numberToWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const wholeNum = Math.floor(Math.abs(num));
  
  if (wholeNum === 0) return 'Zero';
  if (wholeNum < 10) return ones[wholeNum];
  if (wholeNum < 20) return teens[wholeNum - 10];
  if (wholeNum < 100) {
    const ten = Math.floor(wholeNum / 10);
    const one = wholeNum % 10;
    return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
  }
  if (wholeNum < 1000) {
    const hundred = Math.floor(wholeNum / 100);
    const remainder = wholeNum % 100;
    return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (wholeNum < 100000) {
    const thousand = Math.floor(wholeNum / 1000);
    const remainder = wholeNum % 1000;
    return numberToWords(thousand) + ' Thousand' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (wholeNum < 10000000) {
    const lakh = Math.floor(wholeNum / 100000);
    const remainder = wholeNum % 100000;
    return numberToWords(lakh) + ' Lakh' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  
  // For very large numbers, just return a simple representation
  return 'Large Amount';
}

