'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useState, useEffect } from 'react';
import { FiX, FiCheckCircle, FiCalendar, FiUser } from 'react-icons/fi';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';

interface SimpleRecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedStudent?: any;
}

interface SimpleFee {
  id: number;
  month: number;
  year: number;
  amount_due: number;
  amount_paid: number;
  status: string;
  fee_type: string;
}

export default function SimpleRecordPaymentModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  selectedStudent
}: SimpleRecordPaymentModalProps) {
  const [formData, setFormData] = useState({
    student_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    transaction_id: '',
    remarks: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<SimpleFee[]>([]);
  const [selectedFees, setSelectedFees] = useState<number[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (selectedStudent) {
        const data = { ...formData, student_id: selectedStudent.id.toString() };
        setFormData(data);
        loadStudentFees(selectedStudent.id);
      } else {
        fetchStudents();
        resetForm();
      }
      setError('');
    }
  }, [isOpen, selectedStudent]);

  const resetForm = () => {
    setFormData({
      student_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      transaction_id: '',
      remarks: '',
    });
    setSelectedFees([]);
    setFees([]);
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students?status=active');
      const data = await response.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const loadStudentFees = async (studentId: number) => {
    try {
      const response = await fetch(`/api/fees/student-fees?student_id=${studentId}`);
      const data = await response.json();
      if (data.success) {
        // Only show pending/partial fees
        const pendingFees = data.data.filter((fee: SimpleFee) => 
          ['pending', 'partial'].includes(fee.status) && 
          parseFloat(fee.amount_due) > parseFloat(fee.amount_paid || 0)
        );
        setFees(pendingFees);
      }
    } catch (error) {
      console.error('Error fetching student fees:', error);
    }
  };

  const handleFeeSelection = (feeId: number, checked: boolean) => {
    if (checked) {
      setSelectedFees([...selectedFees, feeId]);
    } else {
      setSelectedFees(selectedFees.filter(id => id !== feeId));
    }
  };

  const calculateTotal = () => {
    return fees
      .filter(fee => selectedFees.includes(fee.id))
      .reduce((total, fee) => {
        const remaining = parseFloat(fee.amount_due) - parseFloat(fee.amount_paid || 0);
        return total + remaining;
      }, 0);
  };

  const handleSubmit = async () => {
    if (selectedFees.length === 0) {
      setError('Please select at least one fee to pay');
      return;
    }

    if (!formData.student_id) {
      setError('Please select a student');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const total = calculateTotal();
      
      const response = await fetch('/api/fees/bulk-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: parseInt(formData.student_id),
          student_fee_ids: selectedFees,
          fee_breakdown: [], // No advance payments in simple version
          total_amount_paid: total,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          transaction_id: formData.transaction_id || null,
          remarks: formData.remarks || `Payment for ${selectedFees.length} fee(s)`,
          discount_applied: 0,
          late_fee_charged: 0,
          academic_year: new Date().getFullYear().toString(),
          created_by: 1,
        }),
      });

      const data = await response.json();
      console.log('Payment response:', data);

      if (data.success) {
        onSuccess();
        onClose();
        resetForm();
      } else {
        setError(data.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentChange = (studentId: string) => {
    setFormData({ ...formData, student_id: studentId });
    setSelectedFees([]);
    if (studentId) {
      loadStudentFees(parseInt(studentId));
    } else {
      setFees([]);
    }
  };

  const selectedStudentData = students.find(s => s.id.toString() === formData.student_id) || selectedStudent;

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div className={APP_MODAL_PANEL}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl  text-gray-900">Record Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Student Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student *
            </label>
            <select
              value={formData.student_id}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!!selectedStudent}
            >
              <option value="">Select a student</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.admission_number} - {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Student Info */}
          {selectedStudentData && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiUser className="text-gray-500" />
                <span className="font-medium">
                  {selectedStudentData.admission_number} - {selectedStudentData.first_name} {selectedStudentData.last_name}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Class: {selectedStudentData.class_name || 'Not assigned'} | 
                Phone: {selectedStudentData.parent_phone || 'Not provided'}
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date *
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction ID (Optional)
            </label>
            <input
              type="text"
              value={formData.transaction_id}
              onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter transaction ID if applicable"
            />
          </div>

          {/* Fees Selection */}
          {fees.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Fees to Pay
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {fees.map(fee => {
                  const remaining = parseFloat(fee.amount_due) - parseFloat(fee.amount_paid || 0);
                  const isSelected = selectedFees.includes(fee.id);
                  
                  return (
                    <label key={fee.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleFeeSelection(fee.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {new Date(2024, fee.month - 1).toLocaleString('default', { month: 'long' })} {fee.year}
                          </span>
                          <span className="text-green-600 font-semibold">₹{remaining.toFixed(2)}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {fee.fee_type} - Due: ₹{parseFloat(fee.amount_due).toFixed(2)} | Paid: ₹{parseFloat(fee.amount_paid || 0).toFixed(2)}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {fees.length === 0 && selectedStudentData && (
            <div className="text-center py-8 text-gray-500">
              <FiCheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <p>No pending fees found for this student.</p>
              <p className="text-sm">All fees are already paid or no fees have been assigned.</p>
            </div>
          )}

          {/* Total */}
          {selectedFees.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-900">Total Amount to Pay:</span>
                <span className="text-xl text-blue-600">₹{calculateTotal().toFixed(2)}</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {selectedFees.length} fee(s) selected
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks (Optional)
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add any additional notes about this payment"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedFees.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Recording...
              </>
            ) : (
              <>
                <FiCheckCircle size={16} />
                Record Payment
              </>
            )}
          </button>
        </div>
      </div>
      </AppModal>
  );
}






