'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AddFeeStructureModal from '@/features/fees/components/AddFeeStructureModal';
import RecordPaymentModal from '@/features/fees/components/RecordPaymentModal';
import ViewStudentFeesModal from '@/features/fees/components/ViewStudentFeesModal';
import ReceiptModal from '@/features/fees/components/ReceiptModal';
import VirtualizedFeesStudentsTable from '@/features/fees/components/VirtualizedFeesStudentsTable';
import { compareClassNames } from '@/lib/class-sort';

const STUDENTS_FETCH_LIMIT = 50000;
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import { 
  FiCreditCard, 
  FiFileText, 
  FiAlertCircle, 
  FiPlus, 
  FiUsers,
  FiEye,
  FiSettings,
  FiSearch,
  FiEdit2,
  FiPrinter,
  FiTrash2,
  FiUserCheck,
  FiChevronDown,
  FiChevronUp,
  FiFilter,
  FiBarChart2
} from 'react-icons/fi';

function FeesPageContent() {
  const { alert } = useDialog();
  const searchParams = useSearchParams();
  const { settings, formatCurrency: formatCurrencyFromSettings } = useSettings();
  const [stats, setStats] = useState<any>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'structures'>('overview');
  
  // Modal states
  const [showAddStructure, setShowAddStructure] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showViewFees, setShowViewFees] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [editingFeeStructure, setEditingFeeStructure] = useState<any>(null);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingPayments, setClearingPayments] = useState(false);
  const [deleteAllFees, setDeleteAllFees] = useState(false);
  const [showAssignFees, setShowAssignFees] = useState(false);
  const [assigningFees, setAssigningFees] = useState(false);
  const [showAssignMissing, setShowAssignMissing] = useState(false);
  const [assigningMissing, setAssigningMissing] = useState(false);
  const [showAddFeeStructure, setShowAddFeeStructure] = useState(false);
  const [deletingFeeId, setDeletingFeeId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const toggleSection = (className: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(className)) {
        newSet.delete(className);
      } else {
        newSet.add(className);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allClasses = groupedFeeStructures.sortedKeys;
    setExpandedSections(new Set(allClasses));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const hasActiveFilters = Boolean(searchTerm || selectedClass || selectedSection);
  const activeFilterCount = [searchTerm, selectedClass, selectedSection].filter(Boolean).length;
  const selectedClassName = classes.find((c) => c.id.toString() === selectedClass)?.name;
  const selectedSectionName = sections.find((s) => s.id.toString() === selectedSection)?.name;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'overview' || tab === 'students' || tab === 'structures') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchStats();
    fetchStudents();
    fetchClasses();
  }, [settings.academic_year]);

  useEffect(() => {
    fetchFeeStructures();
  }, [settings.academic_year]);

  // Filter students based on search term, class, and section
  useEffect(() => {
    let filtered = students;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.admission_number?.toLowerCase().includes(searchLower) ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchLower) ||
        s.parent_name?.toLowerCase().includes(searchLower) ||
        s.parent_phone?.includes(searchTerm)
      );
    }

    // Filter by class
    if (selectedClass) {
      filtered = filtered.filter(s => s.class_id?.toString() === selectedClass);
    }

    // Filter by section
    if (selectedSection) {
      filtered = filtered.filter(s => s.section_id?.toString() === selectedSection);
    }

    setFilteredStudents(filtered);
  }, [searchTerm, selectedClass, selectedSection, students]);

  // Load sections when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchSections(selectedClass);
    } else {
      setSections([]);
      setSelectedSection('');
    }
  }, [selectedClass]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/fees/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
        console.log("stats data", data.data);
        setRecentPayments(data.data.recent_payments || []);
      }
    } catch (error) {
      console.error('Error fetching fee stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const academicYear = settings.academic_year || '';
      const yearParam = academicYear ? `?academic_year=${encodeURIComponent(academicYear)}` : '';

      const params = new URLSearchParams({
        status: 'active',
        class_id: 'assigned',
        limit: String(STUDENTS_FETCH_LIMIT),
        page: '1',
      });

      const [studentsRes, statusRes] = await Promise.all([
        fetch(`/api/students?${params}`),
        fetch(`/api/fees/students-status${yearParam}`),
      ]);

      const data = await studentsRes.json();
      const statusData = await statusRes.json();

      if (!data.success) return;

      const statusByStudent: Record<
        number,
        { pendingAmount: number; paymentStatus: string }
      > = statusData.success ? statusData.data : {};

      const studentsWithStatus = data.data.map((student: any) => {
        const feeStatus = statusByStudent[student.id];
        if (feeStatus) {
          return {
            ...student,
            pendingAmount: feeStatus.pendingAmount,
            paymentStatus: feeStatus.paymentStatus,
          };
        }
        return {
          ...student,
          pendingAmount: 0,
          paymentStatus: statusData.success ? 'not_assigned' : 'unknown',
        };
      });

      setStudents(studentsWithStatus);
      setFilteredStudents(studentsWithStatus);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchFeeStructures = async () => {
    try {
      const academicYear = settings.academic_year || '';
      const timestamp = new Date().getTime();
      const yearParam = academicYear ? `academic_year=${encodeURIComponent(academicYear)}&` : '';
      const response = await fetch(`/api/fees/structures?${yearParam}_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json();
      console.log('Fee structures response:', data);
      if (data.success) {
        console.log('Setting fee structures:', data.data);
        setFeeStructures(data.data);
      } else {
        console.error('Failed to fetch fee structures:', data.error);
      }
    } catch (error) {
      console.error('Error fetching fee structures:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (data.success) {
        setClasses(data.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSections = async (classId: string) => {
    try {
      const response = await fetch(`/api/sections?class_id=${classId}`);
      const data = await response.json();
      if (data.success) {
        setSections(data.data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedClass('');
    setSelectedSection('');
  };

  const handleViewStudentFees = (student: any) => {
    setSelectedStudent(student);
    setShowViewFees(true);
  };

  const handleRecordPaymentFromFee = (fee: any) => {
    setSelectedFee(fee);
    setShowRecordPayment(true);
  };

  const handleViewReceipt = async (payment: any, receiptType: 'original' | 'complete' | 'tuition-only' = 'original') => {
    try {
      // Fetch receipt data based on type
      let response;
      
      if (receiptType === 'original') {
        // Fetch original receipt with stored breakdown
        response = await fetch(`/api/fees/receipt/${payment.id}`);
      } else if (receiptType === 'complete') {
        // Fetch complete payment summary for the student
        const student = students.find(s => s.id === payment.student_id);
        response = await fetch(`/api/fees/receipt/complete/${student?.id}`);
      } else if (receiptType === 'tuition-only') {
        // Fetch tuition-only receipt
        response = await fetch(`/api/fees/receipt/tuition/${payment.id}`);
      }
      
      if (!response) {
        throw new Error('Failed to fetch receipt data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedPayment(data.data.payment);
        setSelectedStudent(data.data.student);
        setShowReceipt(true);
      } else {
        console.error('Failed to fetch receipt data:', data.error);
        await alert('Failed to load receipt details', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      await alert('Error loading receipt details', { title: 'Error', type: 'error' });
    }
  };

  const handleClearAllPayments = async () => {
    setClearingPayments(true);
    try {
      const response = await fetch('/api/fees/clear-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deleteAllFees }),
      });
      const data = await response.json();
      
      if (data.success) {
        const message = deleteAllFees 
          ? `Successfully deleted ${data.data.paymentsDeleted} payments and ${data.data.feesDeleted} fee records.`
          : `Successfully cleared ${data.data.paymentsDeleted} payments and reset ${data.data.feesReset} fee records.`;
        await alert(message, { title: 'Success', type: 'success' });
        // Refresh all data
        fetchStats();
        setShowClearConfirm(false);
        setDeleteAllFees(false);
      } else {
        await alert('Failed to clear payments: ' + data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error clearing payments:', error);
      await alert('An error occurred while clearing payments', { title: 'Error', type: 'error' });
    } finally {
      setClearingPayments(false);
    }
  };

  const handleAssignFeesToAll = async () => {
    setAssigningFees(true);
    try {
      const currentYear = settings.academic_year || new Date().getFullYear().toString();
      const currentMonth = new Date().getMonth() + 1;
      
      // Assign fees for current month and next 2 months
      const months = [currentMonth, currentMonth + 1, currentMonth + 2].filter(m => m <= 12);
      
      const response = await fetch('/api/fees/assign-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          academic_year: currentYear,
          months: months
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        await alert(`Successfully assigned fees to ${data.data.studentsProcessed} students (${data.data.feesAssigned} fee records created).`, { title: 'Success', type: 'success' });
        // Refresh all data
        fetchStats();
        setShowAssignFees(false);
      } else {
        await alert('Failed to assign fees: ' + data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error assigning fees:', error);
      await alert('An error occurred while assigning fees', { title: 'Error', type: 'error' });
    } finally {
      setAssigningFees(false);
    }
  };

  const handleAssignMissingFees = async () => {
    setAssigningMissing(true);
    try {
      const currentYear = settings.academic_year || new Date().getFullYear().toString();
      
      const response = await fetch('/api/fees/assign-missing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          academic_year: currentYear
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        if (data.data.studentsProcessed === 0) {
          await alert('All students already have fee records assigned!', { title: 'Notice', type: 'info' });
        } else {
          await alert(`Successfully assigned fees to ${data.data.studentsProcessed} students who were missing fee records (${data.data.feesAssigned} fee records created).`, { title: 'Success', type: 'success' });
        }
        // Refresh all data
        fetchStats();
        setShowAssignMissing(false);
      } else {
        await alert('Failed to assign missing fees: ' + data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error assigning missing fees:', error);
      await alert('An error occurred while assigning missing fees', { title: 'Error', type: 'error' });
    } finally {
      setAssigningMissing(false);
    }
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    // Convert to number and handle edge cases
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    
    // Check if it's a valid number
    if (isNaN(numAmount)) {
      return '₹0.00';
    }
    
    return `₹${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors = {
      cash: 'bg-green-100 text-green-800',
      online: 'bg-blue-100 text-blue-800',
      cheque: 'bg-purple-100 text-purple-800',
      card: 'bg-pink-100 text-pink-800',
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handlePaymentSuccess = () => {
    fetchStats();
    fetchStudents();
  };

  const handleFeeStructureSuccess = () => {
    fetchFeeStructures();
  };

  const handleDeleteFeeStructure = (structure: any) => {
    setFeeToDelete(structure);
    setShowDeleteConfirm(true);
  };

  // Group fee structures by class
  const groupedFeeStructures = useMemo(() => {
    const grouped = feeStructures.reduce((acc: any, structure: any) => {
      const key = structure.class_name || 'All Classes';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(structure);
      return acc;
    }, {});

    // Sort class names (All Classes first, then numeric order)
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'All Classes') return -1;
      if (b === 'All Classes') return 1;
      return compareClassNames(a, b);
    });

    return { grouped, sortedKeys };
  }, [feeStructures]);

  const confirmDeleteFeeStructure = async () => {
    if (!feeToDelete) return;

    setDeletingFeeId(feeToDelete.id);
    try {
      const response = await fetch(`/api/fees/structures?id=${feeToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        await alert(`Successfully deleted "${feeToDelete.fee_type}" fee structure`, { title: 'Success', type: 'success' });
        fetchFeeStructures();
        setShowDeleteConfirm(false);
        setFeeToDelete(null);
      } else {
        // Show detailed error message with guidance
        if (data.hasStudentFees) {
          await alert(`Cannot Delete Fee Structure\n\n${data.error}\n\nSolution: Instead of deleting, you can:\n1. Edit the fee structure\n2. Uncheck "Enable this fee" to deactivate it\n3. This will prevent it from being assigned to new students\n4. Existing student records will remain intact`, { title: 'Cannot Delete', type: 'warning' });
        } else {
          await alert('Failed to delete fee structure: ' + data.error, { title: 'Error', type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error deleting fee structure:', error);
      await alert('An error occurred while deleting the fee structure', { title: 'Error', type: 'error' });
    } finally {
      setDeletingFeeId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl text-gray-900">Fee Management</h1>
            <p className="text-gray-600 mt-1 text-sm">
              {settings.school_name || 'Track and manage student fees'}
              {settings.academic_year && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  Academic Year: {settings.academic_year}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!loading && stats && (
              <button
                type="button"
                onClick={() => setStatsExpanded((prev) => !prev)}
                aria-expanded={statsExpanded}
                className={`border px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                  statsExpanded
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <FiBarChart2 size={15} />
                <span>Stats</span>
                {statsExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
              </button>
            )}
            {activeTab === 'students' && (
              <button
                type="button"
                onClick={() => setFiltersExpanded((prev) => !prev)}
                aria-expanded={filtersExpanded}
                className={`border px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                  filtersExpanded || hasActiveFilters
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <FiFilter size={15} />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="text-xs bg-primary-600 text-white px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {activeFilterCount}
                  </span>
                )}
                {filtersExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
              </button>
            )}
            <button
              onClick={() => setShowAddFeeStructure(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
            >
              <FiSettings />
              Fee Structure
            </button>
            <button
              onClick={() => {
                const firstStudent = filteredStudents.length > 0 ? filteredStudents[0] : null;
                setSelectedStudent(firstStudent);
                setSelectedFee(null);
                setShowRecordPayment(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <FiPlus />
              Record Payment
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {!loading && stats && statsExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600">Total Collected</p>
                  <p className="text-lg text-blue-700 mt-0.5">
                    {formatCurrency(stats.total_collected)}
                  </p>
                </div>
                <RupeeIcon className="w-7 h-7 text-blue-600" />
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-yellow-600">Pending</p>
                  <p className="text-lg text-yellow-700 mt-0.5">
                    {formatCurrency(stats.total_pending)}
                  </p>
                </div>
                <FiCreditCard className="w-7 h-7 text-yellow-600" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600">This Month</p>
                  <p className="text-lg text-green-700 mt-0.5">
                    {formatCurrency(stats.this_month)}
                  </p>
                </div>
                <FiFileText className="w-7 h-7 text-green-600" />
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600">Overdue</p>
                  <p className="text-lg text-red-700 mt-0.5">
                    {formatCurrency(stats.total_overdue)}
                  </p>
                </div>
                <FiAlertCircle className="w-7 h-7 text-red-600" />
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600">Pending Students</p>
                  <p className="text-lg text-purple-700 mt-0.5">
                    {stats.pending_students_count}
                  </p>
                </div>
                <FiUsers className="w-7 h-7 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {!loading && stats && !statsExpanded && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100">
              Collected: {formatCurrency(stats.total_collected)}
            </span>
            <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded border border-yellow-100">
              Pending: {formatCurrency(stats.total_pending)}
            </span>
            <span className="px-2 py-1 bg-green-50 text-green-700 rounded border border-green-100">
              This Month: {formatCurrency(stats.this_month)}
            </span>
            <span className="px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100">
              Overdue: {formatCurrency(stats.total_overdue)}
            </span>
            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-100">
              Pending Students: {stats.pending_students_count}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-1 ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                : 'text-gray-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-2 px-1 ${
              activeTab === 'students'
                ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                : 'text-gray-600'
            }`}
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab('structures')}
            className={`pb-2 px-1 ${
              activeTab === 'structures'
                ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                : 'text-gray-600'
            }`}
          >
            Fee Structures
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Payments */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-base text-gray-900 mb-4">Recent Payments</h3>
              {recentPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No recent payments found
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {payment.first_name} {payment.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{payment.admission_number}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded ${getPaymentMethodBadge(payment.payment_method)}`}>
                            {payment.payment_method.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(payment.amount_paid)}
                          </p>
                          <p className="text-xs text-gray-500">{payment.receipt_number}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleViewReceipt(payment, 'original')}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            title="Original Receipt"
                          >
                            <FiPrinter size={16} />
                          </button>
                          <button
                            onClick={() => handleViewReceipt(payment, 'complete')}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            title="Complete Payment Summary"
                          >
                            <FiFileText size={16} />
                          </button>
                          <button
                            onClick={() => handleViewReceipt(payment, 'tuition-only')}
                            className="px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                            title="Tuition Only (Tax Purpose)"
                          >
                            <FiCreditCard size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Collection by Category */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-base text-gray-900 mb-4">Collection by Category</h3>
              {stats?.collection_by_category?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data available
                </div>
              ) : (
                <div className="space-y-3">
                  {stats?.collection_by_category?.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-700">{item.category}</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-3">
            {filtersExpanded && (
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2 relative">
                    <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by admission number, name, parent name, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                    />
                  </div>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setSelectedSection('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                  >
                    <option value="">All Classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    disabled={!selectedClass}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                  >
                    <option value="">All Sections</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                  {hasActiveFilters ? (
                    <button
                      onClick={handleClearFilters}
                      className="px-3 py-1.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <span />
                  )}
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-gray-900">{filteredStudents.length}</span> of{' '}
                    <span className="font-semibold text-gray-900">{students.length}</span> students
                  </div>
                </div>
              </div>
            )}

            {!filtersExpanded && hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-gray-500">Filtered:</span>
                {searchTerm && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    Search: &quot;{searchTerm}&quot;
                  </span>
                )}
                {selectedClass && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    Class: {selectedClassName || selectedClass}
                  </span>
                )}
                {selectedSection && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    Section: {selectedSectionName || selectedSection}
                  </span>
                )}
                <button
                  onClick={handleClearFilters}
                  className="px-2 py-1 text-primary-600 hover:text-primary-700"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="bg-white rounded-lg shadow">
              {!filtersExpanded && (
                <div className="px-4 py-2 border-b text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{filteredStudents.length}</span> of{' '}
                  <span className="font-semibold text-gray-900">{students.length}</span> students
                </div>
              )}

              <VirtualizedFeesStudentsTable
                students={filteredStudents}
                formatCurrency={formatCurrency}
                onViewFees={handleViewStudentFees}
                onRecordPayment={(student) => {
                  setSelectedStudent(student);
                  setSelectedFee(null);
                  setShowRecordPayment(true);
                }}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </div>
        )}

        {activeTab === 'structures' && 
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  Total Structures: <span className="font-semibold text-gray-900">{feeStructures.length}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Note: All classes start collapsed. Click the arrow icons to expand sections.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={expandAll}
                  className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                  <FiChevronDown size={16} />
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                  <FiChevronUp size={16} />
                  Collapse All
                </button>
                <button
                  onClick={() => fetchFeeStructures()}
                  className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
            <div className="p-6">
              {feeStructures.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-medium">No fee structures found</p>
                  <p className="text-sm mt-1">Click "Fee Structure" button to create one</p>
                </div>
              ) : 
                <div className="space-y-6">
                  {groupedFeeStructures.sortedKeys.map((className) => (
                    <div key={className} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Class Header */}
                      <div 
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                        onClick={() => toggleSection(className)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-base">
                                {className === 'All Classes' ? '🌐' : className.replace(/\D/g, '')}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg text-gray-900">{className}</h3>
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                                  {groupedFeeStructures.grouped[className].length} fee{groupedFeeStructures.grouped[className].length !== 1 ? 's' : ''}
                                </span>
                                {!expandedSections.has(className) && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                    Click to expand
                                  </span>
                                )}
                              </div>
                              {/* Fee Breakdown */}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {groupedFeeStructures.grouped[className].map((fee: any, idx: number) => (
                                  <div 
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-gray-200 shadow-sm"
                                  >
                                    <span className="text-[10px] font-medium text-gray-700">{fee.fee_type}:</span>
                                    <span className="text-[10px] text-gray-900">{formatCurrency(fee.amount)}</span>
                                    {!fee.is_active && (
                                      <span className="text-[10px] text-red-600">(Inactive)</span>
                                    )}
                                    {parseFloat(fee.amount) === 0 && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Free</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {/* Total */}
                              <div className="mt-2 text-sm">
                                <span className="text-gray-700">Total (Active): </span>
                                <span className="text-gray-900 text-base">
                                  {formatCurrency(
                                    groupedFeeStructures.grouped[className]
                                      .filter((s: any) => s.is_active)
                                      .reduce((sum: number, s: any) => sum + parseFloat(s.amount || 0), 0)
                                  )}
                                </span>
                                {groupedFeeStructures.grouped[className].some((s: any) => !s.is_active) && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    (Excluding inactive fees)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <button 
                              className="p-2 rounded-full hover:bg-white/50 transition-colors flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSection(className);
                              }}
                            >
                              {expandedSections.has(className) ? (
                                <FiChevronUp size={20} className="text-blue-600" />
                              ) : (
                                <FiChevronDown size={20} className="text-blue-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Fees Table for this class */}
                      {expandedSections.has(className) && (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Fee</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {groupedFeeStructures.grouped[className].map((structure: any) => (
                                <tr key={structure.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div>
                                      <p className="font-medium text-gray-900">{structure.fee_type}</p>
                                      {structure.description && (
                                        <p className="text-sm text-gray-600 mt-1">{structure.description}</p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="px-1 py-1 text-[10px] font-medium rounded-full bg-blue-100 text-blue-800">
                                      {structure.category_name || 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-900">{formatCurrency(structure.amount)}</span>
                                      {parseFloat(structure.amount) === 0 && (
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                          Free
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="capitalize text-gray-900">{structure.frequency.replace('_', ' ')}</span>
                                  </td>
                                  <td className="px-6 py-4 text-gray-900">{structure.academic_year}</td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      structure.is_active 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {structure.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-600">
                                      <p>{structure.late_fee_percentage || 0}%</p>
                                      <p className="text-xs">{structure.late_fee_days || 0} days grace</p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingFeeStructure(structure);
                                          setShowAddStructure(true);
                                        }}
                                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1 transition-colors text-sm font-medium"
                                      >
                                        <FiEdit2 size={14} />
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteFeeStructure(structure)}
                                        disabled={deletingFeeId === structure.id}
                                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <FiTrash2 size={14} />
                                        {deletingFeeId === structure.id ? 'Deleting...' : 'Delete'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      )}
                    </div>
                  ))}
                </div>
              }
            </div>
          </div>
        }
      </div>

      {/* Modals */}
      <AddFeeStructureModal
        isOpen={showAddStructure}
        onClose={() => {
          setShowAddStructure(false);
          setEditingFeeStructure(null);
        }}
        onSuccess={() => {
          // Small delay to ensure DB has updated
          setTimeout(() => {
            fetchFeeStructures();
            fetchStats(); // Refresh payment stats with new fee amounts
          }, 100);
          setEditingFeeStructure(null);
        }}
        editingFeeStructure={editingFeeStructure}
        feeStructures={feeStructures}
      />


      <ViewStudentFeesModal
        isOpen={showViewFees}
        onClose={() => {
          setShowViewFees(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onRecordPayment={handleRecordPaymentFromFee}
      />

      {/* Receipt Modal */}
      {showReceipt && selectedPayment && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          student={selectedPayment.student || {
            first_name: selectedPayment.first_name,
            last_name: selectedPayment.last_name,
            admission_number: selectedPayment.admission_number,
            class_name: selectedPayment.class_name,
          }}
        />
      )}

      {/* Clear All Payments Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <FiAlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl text-gray-900">Clear All Payments?</h2>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                This will permanently delete all fee payment records {deleteAllFees ? 'and all student fee assignments' : 'and reset all student fees to unpaid status'}.
              </p>
              
              <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteAllFees}
                    onChange={(e) => setDeleteAllFees(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Also delete all fee assignments (student_fees records)
                  </span>
                </label>
                <p className="text-xs text-gray-600 mt-1 ml-6">
                  If unchecked, only payments will be cleared and fees will be reset to unpaid.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-800 mb-1">⚠️ Warning:</p>
                <ul className="text-sm text-red-700 space-y-1 ml-4 list-disc">
                  <li>All payment records will be deleted</li>
                  {deleteAllFees ? (
                    <>
                      <li>All fee assignment records will be deleted</li>
                      <li>Students will have NO fees assigned</li>
                    </>
                  ) : (
                    <li>All fees will be reset to unpaid status</li>
                  )}
                  <li>Payment history will be lost</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearingPayments}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllPayments}
                disabled={clearingPayments}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {clearingPayments ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Clearing...
                  </>
                ) : (
                  <>
                    <FiTrash2 />
                    Yes, Clear All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Fees Confirmation Dialog */}
      {showAssignFees && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FiUserCheck className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl text-gray-900">Assign Fees to All Students?</h2>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                This will assign monthly fees to all {students.length} active students for the current and next 2 months.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-blue-800 mb-2">What will happen:</p>
                <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
                  <li>Fees will be assigned based on each student's class</li>
                  <li>Due date will be set to 10th of each month</li>
                  <li>Existing fee assignments will be preserved</li>
                  <li>Students will see their fees in the system</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAssignFees(false)}
                disabled={assigningFees}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignFeesToAll}
                disabled={assigningFees}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {assigningFees ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <FiUserCheck />
                    Yes, Assign Fees
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Fee Structure Confirmation Dialog */}
      {showDeleteConfirm && feeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <FiTrash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl text-gray-900">Delete Fee Structure?</h2>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                Are you sure you want to delete this fee structure?
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{feeToDelete.fee_type}</p>
                  <p className="text-gray-600">Class: {feeToDelete.class_name || 'All Classes'}</p>
                  <p className="text-gray-600">Amount: {formatCurrency(feeToDelete.amount)}</p>
                  <p className="text-gray-600">Academic Year: {feeToDelete.academic_year}</p>
                  {feeToDelete.description && (
                    <p className="text-gray-600 mt-1">Description: {feeToDelete.description}</p>
                  )}
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-800 mb-1">⚠️ Warning:</p>
                <ul className="text-sm text-red-700 space-y-1 ml-4 list-disc">
                  <li>This fee structure will be permanently deleted</li>
                  <li>If students have fees assigned to this structure, deletion will fail</li>
                  <li>Consider deactivating instead of deleting to preserve data integrity</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setFeeToDelete(null);
                }}
                disabled={deletingFeeId !== null}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFeeStructure}
                disabled={deletingFeeId !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deletingFeeId ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <FiTrash2 />
                    Yes, Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fix Missing Fees Confirmation Dialog */}
      {showAssignMissing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <FiUserCheck className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-xl text-gray-900">Fix Missing Fees?</h2>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                This will assign fee records to students who don't have any fees assigned yet. This ensures all students have payment records with 0 paid amount for easy statistics tracking.
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-orange-800 mb-2">What will happen:</p>
                <ul className="text-sm text-orange-700 space-y-1 ml-4 list-disc">
                  <li>Only students without fee records will be processed</li>
                  <li>Fees will be assigned based on each student's class</li>
                  <li>Due dates will be set to 10th of each month</li>
                  <li>Payment amounts will start at ₹0.00</li>
                  <li>Statistics will show accurate pending amounts</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAssignMissing(false)}
                disabled={assigningMissing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignMissingFees}
                disabled={assigningMissing}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {assigningMissing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <FiUserCheck />
                    Yes, Fix Missing Fees
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <RecordPaymentModal
        isOpen={showRecordPayment}
        onClose={() => {
          setShowRecordPayment(false);
          setSelectedStudent(null);
          setSelectedFee(null);
        }}
        onSuccess={() => {
          fetchStats();
          fetchStudents();
          setShowRecordPayment(false);
          setSelectedStudent(null);
          setSelectedFee(null);
        }}
        selectedStudent={selectedStudent}
        selectedFee={selectedFee}
      />

      <ViewStudentFeesModal
        isOpen={showViewFees}
        onClose={() => setShowViewFees(false)}
        student={selectedStudent}
        onRecordPayment={() => {
          setShowViewFees(false);
          setShowRecordPayment(true);
        }}
      />

      <AddFeeStructureModal
        isOpen={showAddFeeStructure}
        onClose={() => setShowAddFeeStructure(false)}
        onSuccess={() => {
          fetchFeeStructures();
          fetchStats();
          setShowAddFeeStructure(false);
        }}
        feeStructures={feeStructures}
      />

      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        payment={selectedPayment}
        student={selectedStudent}
      />
    </DashboardLayout>
  );
}

export default function FeesPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        </DashboardLayout>
      }
    >
      <FeesPageContent />
    </Suspense>
  );
}

