'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiArrowLeft, FiCalendar, FiDownload, FiCreditCard } from 'react-icons/fi';
import RupeeIcon from '@/components/icons/RupeeIcon';
import { formatCurrency } from '@edulakhya/utils';

export default function FeesPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<any>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFees, setSelectedFees] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchFeesData();
  }, [studentId]);

  const fetchFeesData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/fees?studentId=${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setStudent(data.data.student);
        setFees(data.data.fees);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching fees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeeSelection = (feeId: number) => {
    const newSelection = new Set(selectedFees);
    if (newSelection.has(feeId)) {
      newSelection.delete(feeId);
    } else {
      newSelection.add(feeId);
    }
    setSelectedFees(newSelection);
  };

  const getSelectedTotal = () => {
    return fees
      .filter(fee => selectedFees.has(fee.id))
      .reduce((sum, fee) => {
        const due = parseFloat(fee.amount_due || 0);
        const paid = parseFloat(fee.amount_paid || 0);
        const lateFee = parseFloat(fee.late_fee_amount || 0);
        return sum + (due - paid + lateFee);
      }, 0);
  };

  const handlePayment = () => {
    if (selectedFees.size === 0) {
      alert('Please select at least one fee to pay');
      return;
    }

    const total = getSelectedTotal();
    alert(`Payment of ${formatCurrency(total)} will be processed. This is a demo - actual payment gateway integration pending.`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl text-gray-900">Fee Details</h1>
              <p className="text-sm text-gray-600">
                {student?.first_name} {student?.last_name} - {student?.class_name}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Fees</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(summary?.total || 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <RupeeIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Paid</p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {formatCurrency(summary?.paid || 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <RupeeIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-red-700 mt-1">
                  {formatCurrency(summary?.pending || 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <RupeeIcon className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Fee Details Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Fee Breakdown</h2>
            {selectedFees.size > 0 && (
              <button
                onClick={handlePayment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FiCreditCard className="w-4 h-4" />
                Pay {formatCurrency(getSelectedTotal())}
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFees(new Set(fees.filter(f => parseFloat(f.amount_due) > parseFloat(f.amount_paid)).map(f => f.id)));
                        } else {
                          setSelectedFees(new Set());
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Late Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      No fee records found
                    </td>
                  </tr>
                ) : (
                  fees.map((fee) => {
                    const due = parseFloat(fee.amount_due || 0);
                    const paid = parseFloat(fee.amount_paid || 0);
                    const lateFee = parseFloat(fee.late_fee_amount || 0);
                    const balance = due - paid + lateFee;
                    const isPending = balance > 0;

                    return (
                      <tr key={fee.id} className={!isPending ? 'bg-green-50' : ''}>
                        <td className="px-6 py-4">
                          {isPending && (
                            <input
                              type="checkbox"
                              checked={selectedFees.has(fee.id)}
                              onChange={() => handleFeeSelection(fee.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {fee.fee_type}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {getMonthName(fee.month)} {fee.academic_year?.split('-')[0]}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(fee.due_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatCurrency(due)}
                        </td>
                        <td className="px-6 py-4 text-sm text-green-600">
                          {formatCurrency(paid)}
                        </td>
                        <td className="px-6 py-4 text-sm text-red-600">
                          {formatCurrency(lateFee)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(balance)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            fee.status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : fee.status === 'overdue'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {fee.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Payment Instructions</h3>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li>Select the fees you want to pay by checking the checkboxes</li>
            <li>Click the "Pay" button to proceed with online payment</li>
            <li>You will receive a payment receipt via email and SMS</li>
            <li>Receipts can also be downloaded from the Documents section</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function getMonthName(month: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month - 1] || '';
}



























































