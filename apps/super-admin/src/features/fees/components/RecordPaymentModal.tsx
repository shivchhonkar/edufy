'use client';

import AppModal, {
  APP_MODAL_PANEL,
  APP_MODAL_PANEL_STRUCTURED,
  APP_MODAL_HEADER,
  APP_MODAL_BODY,
} from '@/shared/components/common/AppModal';
import { useState, useEffect, useRef } from 'react';
import { FiX, FiCheckCircle, FiCalendar, FiTruck } from 'react-icons/fi';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import { useDialog } from '@/shared/context/DialogContext';
import ReceiptModal from '@/features/fees/components/ReceiptModal';
import { useSettings } from '@/shared/SettingsContext';
import {
  calendarMonthToSequenceIndex,
  calendarYearForMonth,
  academicYearMatches,
  getAcademicSequence,
  getDefaultAcademicYearForDate,
  normalizeAcademicYear,
  parseAcademicYear,
} from '@/lib/fees/AcademicYear';
import {
  DEFAULT_CLASS_FEES,
  DEFAULT_TRANSPORT_FEE,
  FEE_STATUS,
  getMonthName,
} from '@/shared/constants/constants';
import {
  aggregateFeeRows,
  getFeeLateFeeOutstanding,
  getFeeOutstanding,
  getFeePrincipalBalance,
  isFeeFullySettled,
  isTransportFee,
  isTuitionFee,
} from '@/features/fees/utils/fee-balance';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedStudent?: any;
  selectedFee?: any;
}

interface MonthFee {
  month: number;
  year: number;
  tuitionFee: any | null;
  transportFee: any | null;
  tuitionSelected: boolean;
  transportSelected: boolean;
  status: 'pending' | 'advance' | 'paid' | 'exempted';
}

function isMonthExempted(monthFee: MonthFee): boolean {
  return (
    monthFee.status === 'exempted' ||
    (monthFee.tuitionFee && monthFee.tuitionFee.status === 'exempted')
  );
}

function isMonthTransportPaid(monthFee: MonthFee): boolean {
  if (!monthFee.transportFee) return false;
  if (monthFee.transportFee.isPaid) return true;
  const record = monthFee.transportFee.feeRecord;
  return Boolean(record && isFeeFullySettled(record));
}

function hasTuitionOutstanding(monthFee: MonthFee): boolean {
  if (isMonthExempted(monthFee)) return false;
  if (!monthFee.tuitionFee) return true;
  return getFeeOutstanding(monthFee.tuitionFee) > 0;
}

function hasTransportOutstanding(monthFee: MonthFee): boolean {
  if (!monthFee.transportFee) return false;
  return !isMonthTransportPaid(monthFee);
}

function getMonthTuitionCharge(
  monthFee: MonthFee,
  defaultTuition: number,
  exemptLateFees: boolean,
): number {
  if (!monthFee.tuitionSelected || !hasTuitionOutstanding(monthFee)) return 0;
  if (!monthFee.tuitionFee) return defaultTuition;
  const principal = getFeePrincipalBalance(monthFee.tuitionFee);
  const lateFee = exemptLateFees ? 0 : getFeeLateFeeOutstanding(monthFee.tuitionFee);
  return principal + lateFee;
}

function getMonthTransportCharge(monthFee: MonthFee, transportMonthlyFee: number): number {
  if (!monthFee.transportSelected || !hasTransportOutstanding(monthFee)) return 0;
  const record = monthFee.transportFee?.feeRecord;
  if (record) {
    const outstanding = getFeeOutstanding(record);
    if (outstanding > 0) return outstanding;
  }
  return transportMonthlyFee;
}

function countChargeableSelections(monthFees: MonthFee[]): number {
  let count = 0;
  monthFees.forEach((m) => {
    if (m.tuitionSelected && hasTuitionOutstanding(m)) count++;
    if (m.transportSelected && hasTransportOutstanding(m)) count++;
  });
  return count;
}

function areAllPayableFeesSelected(
  monthFees: MonthFee[],
  includeTransport: boolean,
): boolean {
  return monthFees.every((m) => {
    const tuitionOk = !hasTuitionOutstanding(m) || m.tuitionSelected;
    const transportOk =
      !includeTransport || !hasTransportOutstanding(m) || m.transportSelected;
    return tuitionOk && transportOk;
  });
}

export default function RecordPaymentModal({
  isOpen, 
  onClose, 
  onSuccess,
  selectedStudent,
  selectedFee 
}: RecordPaymentModalProps) {
  const { alert, confirm } = useDialog();
  const { settings } = useSettings();
  
  // Get sidebar collapsed state from localStorage

  // Refs
  const modalContentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    student_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    transaction_id: '',
    remarks: '',
    discount_applied: '0',
  });

  const [initialFormData, setInitialFormData] = useState(formData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedPayment, setSavedPayment] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Month-based fee management
  const [monthFees, setMonthFees] = useState<MonthFee[]>([]);
  const [studentHasTransport, setStudentHasTransport] = useState(false);
  const [transportMonthlyFee, setTransportMonthlyFee] = useState(0);
  const [loadingFees, setLoadingFees] = useState(false);
  const [currentFeeStructures, setCurrentFeeStructures] = useState<any[]>([]);
  const [exemptLateFees, setExemptLateFees] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch current fee structures to ensure we have the latest amounts
      fetchCurrentFeeStructures();
      
      if (selectedStudent) {
        const data = { ...formData, student_id: selectedStudent.id.toString() };
        setFormData(data);
        setInitialFormData(data);
        setStudentSearchTerm(`${selectedStudent.admission_number} - ${selectedStudent.first_name} ${selectedStudent.last_name}`);
        loadStudentMonthlyFees(selectedStudent.id);
      } else {
        fetchStudents();
        resetForm();
      }
      setError('');
      setFieldErrors({});
      setShowStudentDropdown(false);
    }
  }, [isOpen, selectedStudent]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        const dropdown = document.querySelector('.student-dropdown');
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setShowStudentDropdown(false);
        }
      }
    };

    if (showStudentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStudentDropdown]);

  const resetForm = () => {
    const data = {
      student_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      transaction_id: '',
      remarks: '',
      discount_applied: '0',
    };
    setFormData(data);
    setInitialFormData(data);
    setStudentSearchTerm('');
    setMonthFees([]);
    setStudentHasTransport(false);
    setTransportMonthlyFee(0);
    setExemptLateFees(false);
  };

  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData) || 
           monthFees.some(m => m.tuitionSelected || m.transportSelected);
  };

  const handleCancel = () => {
    if (hasChanges()) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students?status=active');
      const data = await response.json();
      if (data.success) {
        setStudents(data.data);
        setFilteredStudents(data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // Filter students based on search term
  useEffect(() => {
    if (!studentSearchTerm.trim()) {
      setFilteredStudents(students);
    } else {
      const searchLower = studentSearchTerm.toLowerCase();
      const filtered = students.filter(student => 
        student.admission_number?.toLowerCase().includes(searchLower) ||
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchLower) ||
        student.parent_phone?.includes(studentSearchTerm)
      );
      setFilteredStudents(filtered);
    }
  }, [studentSearchTerm, students]);

  const handleStudentSelect = (student: any) => {
    setFormData({ ...formData, student_id: student.id.toString() });
    setStudentSearchTerm(`${student.admission_number} - ${student.first_name} ${student.last_name}`);
    setShowStudentDropdown(false);
    loadStudentMonthlyFees(student.id);
  };

  const loadStudentMonthlyFees = async (studentId: number) => {
    setLoadingFees(true);
    try {
      const feeParams = new URLSearchParams({ student_id: String(studentId) });
      if (settings.academic_year) {
        feeParams.set('academic_year', settings.academic_year);
      }

      const response = await fetch(`/api/fees/student-fees?${feeParams}`);
      const data = await response.json();
      
      // Get payment history to check transport payments
      const paymentsResponse = await fetch(`/api/fees?student_id=${studentId}`);
      const paymentsData = await paymentsResponse.json();
      
      // Debug logging
      console.log('Payment data for student:', studentId, paymentsData);
      
      // Get transport info
      const transportResponse = await fetch(`/api/transport/assignments?student_id=${studentId}`);
      const transportData = await transportResponse.json();
      
      const hasTransport = transportData.success && transportData.data && transportData.data.length > 0;
      setStudentHasTransport(hasTransport);
      
      if (hasTransport) {
        const transportFee = parseFloat(transportData.data[0]?.transport_fee || transportData.data[0]?.pickup_fee || DEFAULT_TRANSPORT_FEE);
        setTransportMonthlyFee(transportFee);
      }

      // Generate months based on academic year (April to March)
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const academicYearFromSettings = settings.academic_year;
      const parsedYear = parseAcademicYear(
        academicYearFromSettings
          ? normalizeAcademicYear(academicYearFromSettings)
          : `${currentDate.getFullYear()}-${String((currentDate.getFullYear() + 1) % 100).padStart(2, '0')}`,
      );
      const currentAcademicYear = parsedYear.name;
      const allStudentFees: Array<Record<string, unknown>> = data.success ? data.data : [];

      const generatedMonths: MonthFee[] = [];
      const currentSequenceIndex = calendarMonthToSequenceIndex(currentMonth);

      for (let sequenceIndex = 1; sequenceIndex <= 12; sequenceIndex++) {
        const month = getAcademicSequence()[sequenceIndex - 1];
        const year = calendarYearForMonth(parsedYear, month);
        const i = sequenceIndex - currentSequenceIndex;

        const monthTuitionFees = allStudentFees.filter((f) => {
          const feeMonth = parseInt(String(f.month), 10);
          return feeMonth === month && isTuitionFee(f as { fee_type?: string });
        });
        const existingTuitionFee = aggregateFeeRows(
          monthTuitionFees as Parameters<typeof aggregateFeeRows>[0],
        );

        const monthTransportFees = allStudentFees.filter((f) => {
          const feeMonth = parseInt(String(f.month), 10);
          return feeMonth === month && isTransportFee(f as { fee_type?: string });
        });
        const existingTransportFee = aggregateFeeRows(
          monthTransportFees as Parameters<typeof aggregateFeeRows>[0],
        );
        
        const transportPayment =
          existingTransportFee && isFeeFullySettled(existingTransportFee);
        
        const tuitionPayment = paymentsData.success
          ? paymentsData.data.find((p: Record<string, unknown>) => {
              const paymentMonth = parseInt(String(p.month), 10);
              const feeType = String(p.fee_type || '');
              const isTuitionPayment = !feeType || !feeType.toLowerCase().includes('transport');
              const isCompleted = p.status === 'completed';
              return (
                paymentMonth === month &&
                academicYearMatches(String(p.academic_year || ''), currentAcademicYear) &&
                isTuitionPayment &&
                isCompleted
              );
            })
          : null;
        
        
        // Determine status based on existing fee OR payment history
        let status: 'pending' | 'advance' | 'paid' | 'exempted' = 'advance';
        
        // Check for exempted status first
        if (existingTuitionFee && existingTuitionFee.status === 'exempted') {
          status = 'exempted';
        }
        // IMPORTANT: Check if month is in the future FIRST (for monthly frequency)
        // Future months should always be ADVANCE, regardless of fee records
        else if (i > 0) {
          // Future month - always ADVANCE (available for advance payment)
          status = 'advance';
        }         else if (existingTuitionFee) {
          if (isFeeFullySettled(existingTuitionFee)) {
            status = 'paid';
          } else {
            status = 'pending';
          }
        } else if (tuitionPayment) {
          // Current or past month with payment - mark as paid
          const paymentAmount = parseFloat(tuitionPayment.amount_paid || 0);
          if (paymentAmount > 0) {
            status = 'paid';
          } else {
            status = 'pending';
          }
        } else {
          // Current or past month without fee/payment record - pending
          status = 'pending';
        }
        
        generatedMonths.push({
          month,
          year,
          tuitionFee: existingTuitionFee || (tuitionPayment && parseFloat(tuitionPayment.amount_paid || 0) > 0 ? {
            ...tuitionPayment,
            status: 'paid',
            amount_due: tuitionPayment.amount_paid,
            amount_paid: tuitionPayment.amount_paid,
            calculated_late_fee: 0
          } : null),
          transportFee: hasTransport ? { 
            amount: transportMonthlyFee, 
            month, 
            year,
            isPaid: !!transportPayment,
            feeRecord: existingTransportFee
          } : null,
          tuitionSelected: false,
          transportSelected: false,
          status,
        });
      }
      
      setMonthFees(generatedMonths);
    } catch (error) {
      console.error('Error loading monthly fees:', error);
    } finally {
      setLoadingFees(false);
    }
  };

  const toggleMonthSelection = (index: number, type: 'tuition' | 'transport') => {
    const newMonthFees = [...monthFees];
    if (type === 'tuition') {
      newMonthFees[index].tuitionSelected = !newMonthFees[index].tuitionSelected;
    } else {
      newMonthFees[index].transportSelected = !newMonthFees[index].transportSelected;
    }
    setMonthFees(newMonthFees);
  };

  const handleFeeExemption = async (index: number) => {
    if (!selectedStudentData) return;
    
    const monthFee = monthFees[index];
    const confirmExempt = await confirm(
      `Are you sure you want to exempt the fee for ${getMonthName(monthFee.month)} ${monthFee.year}?\n\nThis will mark the fee as waived/exempted for ${selectedStudentData.first_name} ${selectedStudentData.last_name}.`,
      { title: 'Exempt Fee', type: 'warning', confirmText: 'Exempt' }
    );
    
    if (!confirmExempt) return;
    
    try {
      const response = await fetch('/api/fees/exempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentData.id,
          month: monthFee.month,
          year: monthFee.year,
          academic_year: `${monthFee.year}-${monthFee.year + 1}`,
          exemption_reason: 'Fee exempted by admin',
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        await alert(`Fee for ${getMonthName(monthFee.month)} ${monthFee.year} has been exempted successfully!`, { title: 'Success', type: 'success' });
        loadStudentMonthlyFees(selectedStudentData.id);
      } else {
        await alert('Failed to exempt fee: ' + data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error exempting fee:', error);
      await alert('An error occurred while exempting the fee.', { title: 'Error', type: 'error' });
    }
  };

  const handleExemptAllMonths = async () => {
    if (!selectedStudentData) return;
    
    const confirmExempt = await confirm(
      `Are you sure you want to exempt ALL months' fees for ${selectedStudentData.first_name} ${selectedStudentData.last_name}?\n\nThis will waive all pending fees for the entire academic year.`,
      { title: 'Exempt All Fees', type: 'danger', confirmText: 'Exempt All' }
    );
    
    if (!confirmExempt) return;
    
    try {
      const response = await fetch('/api/fees/exempt-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentData.id,
          academic_year: settings.academic_year || getDefaultAcademicYearForDate().name,
          exemption_reason: 'All fees exempted by admin',
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        await alert(`All fees for ${selectedStudentData.first_name} ${selectedStudentData.last_name} have been exempted successfully!`, { title: 'Success', type: 'success' });
        loadStudentMonthlyFees(selectedStudentData.id);
      } else {
        await alert('Failed to exempt all fees: ' + data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error exempting all fees:', error);
      await alert('An error occurred while exempting all fees.', { title: 'Error', type: 'error' });
    }
  };

  const calculateTotal = () => {
    let total = 0;
    let lateFeeTotal = 0;
    const payingStudent =
      students.find((s) => s.id.toString() === formData.student_id) || selectedStudent;
    const defaultTuition = getDefaultTuitionFee(payingStudent?.class_id);

    monthFees.forEach((m) => {
      total += getMonthTuitionCharge(m, defaultTuition, exemptLateFees);
      total += getMonthTransportCharge(m, transportMonthlyFee);

      if (m.tuitionSelected && hasTuitionOutstanding(m) && m.tuitionFee) {
        lateFeeTotal += parseFloat(m.tuitionFee.calculated_late_fee || 0);
      }
    });

    return { total, lateFeeTotal };
  };

  const getSelectedCount = () => countChargeableSelections(monthFees);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const selectedCount = getSelectedCount();
    if (selectedCount === 0) {
      setError('Please select at least one month to pay');
      return;
    }

    if (!formData.student_id) {
      setError('Please select a student');
      return;
    }

    setLoading(true);

    try {
      const { total, lateFeeTotal } = calculateTotal();
      
      // Collect selected fee IDs and breakdown (avoid duplicating existing records)
      const selectedFeeIds: number[] = [];
      const feeBreakdown: Array<{ fee_type: string; month: number; year: number; amount: number }> = [];

      monthFees.forEach(m => {
        if (m.tuitionSelected && hasTuitionOutstanding(m)) {
          if (m.tuitionFee?.id) {
            selectedFeeIds.push(m.tuitionFee.id);
          } else {
            feeBreakdown.push({
              fee_type: 'Tuition Fee',
              month: m.month,
              year: m.year,
              amount: getDefaultTuitionFee(selectedStudentData?.class_id),
            });
          }
        }

        if (m.transportSelected && hasTransportOutstanding(m)) {
          const transportRecord = m.transportFee?.feeRecord;
          if (transportRecord?.id) {
            selectedFeeIds.push(transportRecord.id);
          } else {
            feeBreakdown.push({
              fee_type: 'Transport Fee',
              month: m.month,
              year: m.year,
              amount: transportMonthlyFee,
            });
          }
        }
      });

      const studentFeeLateFees: Record<number, number> = {};
      if (!exemptLateFees) {
        monthFees.forEach((m) => {
          if (m.tuitionSelected && hasTuitionOutstanding(m) && m.tuitionFee?.id) {
            const late = parseFloat(m.tuitionFee.calculated_late_fee || 0);
            if (late > 0) {
              studentFeeLateFees[m.tuitionFee.id] = late;
            }
          }
        });
      }

      const baseRemarks = formData.remarks || `Payment for ${selectedCount} fee(s)`;
      const payload = {
        student_id: parseInt(formData.student_id),
        student_fee_ids: selectedFeeIds,
        fee_breakdown: feeBreakdown,
        total_amount_paid: total,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        transaction_id: formData.transaction_id || null,
        remarks: exemptLateFees ? `${baseRemarks} (Late fees exempted by admin)` : baseRemarks,
        discount_applied: parseFloat(formData.discount_applied),
        late_fee_charged: exemptLateFees ? 0 : lateFeeTotal,
        exempt_late_fees: exemptLateFees,
        student_fee_late_fees: studentFeeLateFees,
        academic_year: settings.academic_year || getDefaultAcademicYearForDate().name,
        created_by: 1,
      };

      console.log('Payment payload being sent:', payload);
      console.log('Selected fee IDs:', selectedFeeIds);
      console.log('Fee breakdown:', feeBreakdown);
      console.log('Total amount:', total);

      const response = await fetch('/api/fees/bulk-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Payment response received:', data);

      if (data.success) {
        setSavedPayment(data.data);
        setShowSuccessDialog(true);
        // Don't call onSuccess() here - let the success dialog handle it
      } else {
        console.error('Payment failed:', data);
        setError(data.error || 'Failed to record payment. Please check the console for details.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedStudentData = students.find(s => s.id.toString() === formData.student_id) || selectedStudent;

  const getDefaultTuitionFee = (classId: number) => {
    // Try to get fee amount from current fee structures first
    if (currentFeeStructures.length > 0) {
      const tuitionFee = currentFeeStructures.find(fs => 
        fs.class_id === classId && 
        fs.fee_type.toLowerCase().includes('tuition') &&
        fs.is_active
      );
      if (tuitionFee) {
        return parseFloat(tuitionFee.amount);
      }
    }

    // Try to get fee amount from existing month fees
    if (monthFees && monthFees.length > 0) {
      const existingFee = monthFees.find(m => m.tuitionFee && m.tuitionFee.amount_due);
      if (existingFee) {
        return parseFloat(existingFee.tuitionFee.amount_due);
      }
    }
    
    // Fallback to default class fees from constants
    return DEFAULT_CLASS_FEES[classId] || 4000;
  };

  // Calculate values for display
  const selectedCount = getSelectedCount();
  const { total: calculatedTotal, lateFeeTotal: calculatedLateFeeTotal } = calculateTotal();

  const getMonthStatus = (monthFee: MonthFee) => {
    const tuitionIsPaid =
      monthFee.status === 'paid' ||
      (monthFee.tuitionFee && isFeeFullySettled(monthFee.tuitionFee));
    const isExempted =
      monthFee.status === 'exempted' ||
      (monthFee.tuitionFee && monthFee.tuitionFee.status === 'exempted');
    const hasLateFeeDue =
      monthFee.tuitionFee && getFeeLateFeeOutstanding(monthFee.tuitionFee) > 0;

    if (isExempted) return { color: 'text-purple-600', label: 'EXEMPTED' };
    if (hasLateFeeDue) return { color: 'text-orange-600', label: 'LATE FEE' };
    if (tuitionIsPaid) return { color: 'text-green-600', label: 'PAID' };
    if (monthFee.status === 'pending') return { color: 'text-red-600', label: 'PENDING' };
    return { color: 'text-blue-600', label: 'ADVANCE' };
  };

  // Fetch current fee structures
  const fetchCurrentFeeStructures = async () => {
    try {
      const response = await fetch('/api/fees/structures?is_active=true');
      const data = await response.json();
      if (data.success) {
        setCurrentFeeStructures(data.data);
      }
    } catch (error) {
      console.error('Error fetching fee structures:', error);
    }
  };

  return (
    <>
      <AppModal open={isOpen} onClose={onClose}>
      <div ref={modalContentRef} className={APP_MODAL_PANEL_STRUCTURED}>
          {/* Fixed Header */}
          <div className={`${APP_MODAL_HEADER} px-4 py-2 sm:px-6 sm:py-3`}>
            <h2 className="text-xl text-gray-900">Record Payment</h2>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX size={28} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className={APP_MODAL_BODY}>
            <form id="payment-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Student Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Student Information</h3>
              <div className="relative">
                {selectedStudent ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                    <p className="font-semibold">{selectedStudent.admission_number} - {selectedStudent.first_name} {selectedStudent.last_name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Class: {selectedStudent.class_name || 'N/A'} | Phone: {selectedStudent.parent_phone || 'N/A'}
                    </p>
                  </div>
                ) : (
                  <>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={studentSearchTerm}
                      onChange={(e) => {
                        setStudentSearchTerm(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      placeholder="Search by admission number, name, or phone..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    />
                    {showStudentDropdown && filteredStudents.length > 0 && (
                      <div className="student-dropdown absolute z-[60] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredStudents.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => handleStudentSelect(student)}
                            className="w-full text-left px-4 py-3 hover:bg-primary-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-gray-900">
                              {student.admission_number} - {student.first_name} {student.last_name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Class: {student.class_name || 'N/A'} | Phone: {student.parent_phone || 'N/A'}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Monthly Fee Selection */}
            {formData.student_id && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Select Months to Pay</h3>
                  <div className="flex items-center gap-2">
                    {studentHasTransport && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Transport
                      </span>
                    )}
                    {(() => {
                      const pendingMonths = monthFees.filter(
                        (m) => m.status === 'pending' && hasTuitionOutstanding(m),
                      );
                      
                      const hasAnyPayableMonths = monthFees.length > 0; // Any month can be paid
                      
                      return (
                        <>
                          {pendingMonths.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                // Check if pending months are already selected
                                const allPendingSelected = pendingMonths.every(
                                  (m) =>
                                    m.tuitionSelected &&
                                    (!studentHasTransport ||
                                      !hasTransportOutstanding(m) ||
                                      m.transportSelected),
                                );
                                
                                if (allPendingSelected) {
                                  // If all pending are selected, deselect them
                                  const newMonthFees = monthFees.map(m => ({
                                    ...m,
                                    tuitionSelected: false,
                                    transportSelected: false
                                  }));
                                  setMonthFees(newMonthFees);
                                } else {
                                  // Select only pending months, deselect advance months
                                  const newMonthFees = monthFees.map((m) => {
                                    if (m.status === 'pending' && hasTuitionOutstanding(m)) {
                                      return {
                                        ...m,
                                        tuitionSelected: true,
                                        transportSelected:
                                          studentHasTransport && hasTransportOutstanding(m),
                                      };
                                    }
                                    return {
                                      ...m,
                                      tuitionSelected: false,
                                      transportSelected: false,
                                    };
                                  });
                                  setMonthFees(newMonthFees);
                                }
                              }}
                              className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200"
                              title="Toggle pending months selection"
                            >
                              Pay All Pending
                            </button>
                          )}
                          
                          {hasAnyPayableMonths && (
                            <button
                              type="button"
                              onClick={() => {
                                // Check if all months are already selected
                                const allMonthsSelected = areAllPayableFeesSelected(
                                  monthFees,
                                  studentHasTransport,
                                );
                                
                                if (allMonthsSelected) {
                                  // If all are selected, deselect them all
                                  const newMonthFees = monthFees.map(m => ({
                                    ...m,
                                    tuitionSelected: false,
                                    transportSelected: false
                                  }));
                                  setMonthFees(newMonthFees);
                                } else {
                                  // Select all 12 months (both pending and advance)
                                  const newMonthFees = monthFees.map((m) => ({
                                    ...m,
                                    tuitionSelected: hasTuitionOutstanding(m),
                                    transportSelected:
                                      studentHasTransport && hasTransportOutstanding(m),
                                  }));
                                  setMonthFees(newMonthFees);
                                }
                              }}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                              title="Toggle all 12 months selection"
                            >
                              Pay All
                            </button>
                          )}
                          
                          <button
                            type="button"
                            onClick={handleExemptAllMonths}
                            className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
                            title="Exempt all months' fees for this student"
                          >
                            Exempt All
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {loadingFees ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <p className="text-gray-500 mt-2 text-sm">Loading fees...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[450px] overflow-y-auto pr-1">
                      {monthFees.map((monthFee, index) => {
                        const monthStatus = getMonthStatus(monthFee);
                        const tuitionLateFeeDue = monthFee.tuitionFee
                          ? getFeeLateFeeOutstanding(monthFee.tuitionFee)
                          : 0;
                        const tuitionIsPaid =
                          !tuitionLateFeeDue &&
                          (monthFee.status === 'paid' ||
                            (monthFee.tuitionFee && isFeeFullySettled(monthFee.tuitionFee)));
                        const tuitionHasOutstanding =
                          monthFee.tuitionFee && getFeeOutstanding(monthFee.tuitionFee) > 0;
                        const isExempted =
                          monthFee.status === 'exempted' ||
                          (monthFee.tuitionFee && monthFee.tuitionFee.status === 'exempted');

                        let tuitionAmount;
                        let tuitionLateFee;
                        if (tuitionIsPaid && monthFee.tuitionFee) {
                          tuitionAmount = parseFloat(monthFee.tuitionFee.amount_paid || 0);
                          tuitionLateFee = 0;
                        } else if (isExempted) {
                          tuitionAmount = 0;
                          tuitionLateFee = 0;
                        } else if (monthFee.tuitionFee) {
                          tuitionAmount = getFeePrincipalBalance(monthFee.tuitionFee);
                          tuitionLateFee = tuitionLateFeeDue;
                        } else {
                          tuitionAmount = getDefaultTuitionFee(selectedStudentData?.class_id);
                          tuitionLateFee = 0;
                        }
                        const transportIsPaid = isMonthTransportPaid(monthFee);
                        
                        return (
                          <div key={index} className={`border rounded-md p-2 ${
                            isExempted
                              ? 'bg-purple-50 border-purple-200' :
                            (tuitionIsPaid && transportIsPaid) 
                              ? 'bg-green-50 border-green-200' :
                            (tuitionIsPaid || transportIsPaid)
                              ? 'bg-green-50 border-green-200' :
                            monthFee.status === 'pending' 
                              ? 'bg-orange-50 border-orange-200' :
                            'bg-gray-50 border-gray-200'
                          }`}>
                            {/* Month Header - Compact */}
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className={`font-semibold text-sm ${
                                isExempted ? 'text-purple-800' :
                                (tuitionIsPaid && transportIsPaid) ? 'text-green-800' : 
                                (tuitionIsPaid || transportIsPaid) ? 'text-green-800' :
                                'text-gray-900'
                              }`}>
                                {getMonthName(monthFee.month)} {monthFee.year}
                                {(tuitionIsPaid && transportIsPaid) && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">PAID</span>}
                              </h4>
                              <div className="flex items-center gap-1">
                                {!tuitionIsPaid && !isExempted && (
                                  <button
                                    type="button"
                                    onClick={() => handleFeeExemption(index)}
                                    className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                                    title="Exempt this month's fee"
                                  >
                                    Exempt
                                  </button>
                                )}
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  isExempted ? 'bg-purple-100 text-purple-800' :
                                  tuitionIsPaid ? 'bg-green-100 text-green-800' :
                                  monthFee.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {isExempted ? 'EXEMPTED' : tuitionIsPaid ? 'PAID' : monthStatus.label}
                                </span>
                              </div>
                            </div>
                                  
                            {/* Tuition Fee - Compact */}
                            <div className={`flex items-center gap-2 p-2 rounded border ${
                              isExempted
                                ? 'bg-white/50 border-purple-200' :
                              tuitionIsPaid 
                                ? 'bg-white/50 border-green-200' 
                                : monthFee.tuitionSelected 
                                  ? 'bg-blue-50 border-blue-300' 
                                  : 'bg-white border-gray-200'
                            }`}>
                              <input
                                type="checkbox"
                                checked={
                                  (tuitionIsPaid && !tuitionLateFeeDue) ||
                                  isExempted ||
                                  monthFee.tuitionSelected
                                }
                                onChange={() =>
                                  tuitionHasOutstanding &&
                                  !isExempted &&
                                  toggleMonthSelection(index, 'tuition')
                                }
                                disabled={!tuitionHasOutstanding || isExempted}
                                className="w-4 h-4 text-primary-600 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900">
                                  Tuition Fee
                                  {isExempted && <span className="text-xs text-purple-600">⊘ Exempted</span>}
                                </span>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className={`text-sm font-semibold ${
                                  isExempted ? 'text-purple-700 line-through' :
                                  tuitionIsPaid ? 'text-green-700 line-through' : 
                                  'text-gray-900'
                                }`}>
                                  ₹{tuitionAmount.toFixed(0)}
                                </div>
                                {tuitionLateFee > 0 && !isExempted && (
                                  <div className="text-xs text-red-600">
                                    +₹{tuitionLateFee.toFixed(0)} late fee
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Transport Fee - Compact */}
                            {studentHasTransport && (
                              <div className={`flex items-center gap-2 p-2 rounded border mt-1 ${
                                transportIsPaid 
                                  ? 'bg-white/50 border-green-200'
                                  : monthFee.transportSelected 
                                    ? 'bg-blue-50 border-blue-300' 
                                    : 'bg-white border-gray-200'
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={transportIsPaid || monthFee.transportSelected}
                                  onChange={() => !transportIsPaid && toggleMonthSelection(index, 'transport')}
                                  disabled={transportIsPaid}
                                  className="w-4 h-4 text-primary-600 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-gray-900">
                                    Transport Fee {transportIsPaid && <span className="text-xs text-green-600">✓</span>}
                                  </span>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className={`text-sm font-semibold ${transportIsPaid ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                                    ₹{transportMonthlyFee.toFixed(0)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Selection Summary - Compact */}
                    {selectedCount > 0 && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-300 rounded-md sticky bottom-0 shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {selectedCount} fee{selectedCount > 1 ? 's' : ''} selected
                          </span>
                          <button
                            type="button"
                            onClick={() => setMonthFees(monthFees.map(m => ({ ...m, tuitionSelected: false, transportSelected: false })))}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium bg-white px-2 py-0.5 rounded"
                          >
                            Clear
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="bg-white px-3 py-2 rounded border flex-1">
                            <p className="text-xs text-gray-600">Total Amount</p>
                            <p className="text-lg font-bold text-primary-700">₹{calculatedTotal.toFixed(0)}</p>
                          </div>
                          {calculatedLateFeeTotal > 0 && (
                            <div className="bg-white px-3 py-2 rounded border flex-1">
                              <p className="text-xs text-gray-600">Late Fees</p>
                              <p
                                className={`text-lg font-bold ${
                                  exemptLateFees
                                    ? 'text-gray-400 line-through'
                                    : 'text-red-600'
                                }`}
                              >
                                ₹{calculatedLateFeeTotal.toFixed(0)}
                              </p>
                              <label className="mt-2 flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={exemptLateFees}
                                  onChange={(e) => setExemptLateFees(e.target.checked)}
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-xs font-medium text-gray-700">
                                  Exempt late fees
                                </span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Payment Details */}
            {selectedCount > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    >
                      <option value="cash">Cash</option>
                      <option value="online">Online</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={formData.transaction_id}
                      onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      placeholder="For online/card payments"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Applied (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.discount_applied}
                      onChange={(e) => setFormData({ ...formData, discount_applied: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>
              </div>
            )}

          </form>

          {/* Action Buttons - Scrollable */}
          <div className="flex justify-end gap-4 px-6 py-4 border-t border-gray-200 bg-white">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="payment-form"
              disabled={loading || selectedCount === 0}
              className="px-6 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Recording...' : `Record Payment (₹${calculatedTotal.toFixed(2)})`}
            </button>
          </div>
          </div>
        </div>
        </AppModal>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close without saving?"
        onConfirm={() => {
          setShowConfirmDialog(false);
          onClose();
        }}
        onCancel={() => setShowConfirmDialog(false)}
      />

      {/* Success Dialog */}
      {showSuccessDialog && savedPayment && (
        <AppModal open onClose={onClose}>
      <div className={APP_MODAL_PANEL}>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <FiCheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl text-gray-900 mb-2">Payment Recorded!</h3>
              <p className="text-gray-600 mb-4">
                Payment for {selectedCount} fee(s) has been recorded successfully.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-1">Receipt Number</p>
                <p className="text-xl text-primary-600 font-mono">{savedPayment.receipt_number}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-green-800">
                  Total Paid: ₹{calculatedTotal.toFixed(2)}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowSuccessDialog(false);
                    setShowReceipt(true);
                  }}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                >
                  View Receipt
                </button>
                <button
                  onClick={() => {
                    setShowSuccessDialog(false);
                    onSuccess(); // Call onSuccess to refresh data
                    onClose(); // Then close the modal
                  }}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          </AppModal>
      )}

      {/* Receipt Modal */}
      {showReceipt && savedPayment && selectedStudentData && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            setSavedPayment(null);
            onSuccess(); // Call onSuccess to refresh data
            onClose(); // Then close the modal
          }}
          payment={savedPayment}
          student={selectedStudentData}
        />
      )}
    </>
  );
}
