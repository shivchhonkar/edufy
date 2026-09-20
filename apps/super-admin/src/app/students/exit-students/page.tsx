'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import VirtualizedStudentSelectTable from '@/features/students/components/VirtualizedStudentSelectTable';
import TransferCertificateModal from '@/features/students/components/TransferCertificateModal';
import { usePreselectExitStudentFromUrl } from '@/features/students/hooks/usePreselectStudentFromUrl';
import { buildTransferCertificateSchoolInfo } from '@/features/students/utils/transfer-certificate-record';
import { studentFullName } from '@/features/students/utils/student-profile';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import { getClientUser } from '@/lib/client-auth';
import { hasRole } from '@/lib/auth';
import {
  CLEARANCE_DEPARTMENTS,
  EXIT_REASONS,
  EXIT_STATUS_LABELS,
  PRINCIPAL_APPROVER_ROLES,
  type ExitStatus,
  type StudentExitRecord,
} from '@/lib/student-exit-utils';
import type { Student } from '@/shared/types';
import {
  FiArrowLeft,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiFileText,
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiUserMinus,
  FiXCircle,
} from 'react-icons/fi';

const STUDENTS_FETCH_LIMIT = 50000;
const UNASSIGNED_CLASS_FILTER = 'unassigned';

interface ClassOption {
  id: number;
  name: string;
}

interface SectionOption {
  id: number;
  class_id: number;
  name: string;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusBadgeClass(status: ExitStatus) {
  switch (status) {
    case 'EXITED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-700';
    case 'PRINCIPAL_PENDING':
      return 'bg-purple-100 text-purple-800';
    case 'CERTIFICATES_PENDING':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

function validationStatusClass(status: string) {
  switch (status) {
    case 'cleared':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'pending':
      return 'text-amber-800 bg-amber-50 border-amber-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function ExitStepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: 'Select student' },
    { num: 2, label: 'Initiate exit' },
    { num: 3, label: 'Validation' },
    { num: 4, label: 'Clearance' },
    { num: 5, label: 'Principal approval' },
    { num: 6, label: 'Certificates & complete' },
  ];

  return (
    <ol className="flex flex-wrap items-center gap-1 sm:gap-2 rounded-lg border border-gray-200 bg-gray-50/80 p-2 sm:p-3">
      {steps.map((step, index) => {
        const done = currentStep > step.num;
        const active = currentStep === step.num;
        return (
          <li key={step.num} className="flex items-center gap-1 sm:gap-2">
            {index > 0 && <span className="text-gray-300 hidden sm:inline">→</span>}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                done
                  ? 'bg-green-100 text-green-800'
                  : active
                    ? 'bg-primary-100 text-primary-800 ring-1 ring-primary-300'
                    : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {done ? <FiCheck size={12} /> : <span>{step.num}</span>}
              <span className="hidden md:inline">{step.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function ExitStudentsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        </DashboardLayout>
      }
    >
      <ExitStudentsPageContent />
    </Suspense>
  );
}

function ExitStudentsPageContent() {
  const { alert, confirm } = useDialog();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'process' | 'history'>('process');
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [pickerExpanded, setPickerExpanded] = useState(true);

  const [exitReasonCode, setExitReasonCode] = useState('TRANSFER');
  const [exitDate, setExitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [activeExit, setActiveExit] = useState<StudentExitRecord | null>(null);
  const [loadingExit, setLoadingExit] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [historyItems, setHistoryItems] = useState<StudentExitRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');

  const [showTcModal, setShowTcModal] = useState(false);
  const [reportSettings, setReportSettings] = useState<{
    counsellor_name?: string;
    counsellor_signature_url?: string;
  }>({});

  const [transferCertificate, setTransferCertificate] = useState(true);
  const [characterCertificate, setCharacterCertificate] = useState(true);
  const [bonafide, setBonafide] = useState(false);

  const currentUser = getClientUser();
  const canPrincipalApprove = currentUser?.role
    ? hasRole(currentUser.role, [...PRINCIPAL_APPROVER_ROLES])
    : false;

  usePreselectExitStudentFromUrl(students, setSelectedStudentId, setActiveTab);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const tcSchoolInfo = useMemo(
    () => buildTransferCertificateSchoolInfo(settings, reportSettings),
    [settings, reportSettings]
  );

  const currentStep = useMemo(() => {
    if (!selectedStudentId) return 1;
    if (!activeExit) return 2;
    if (activeExit.status === 'EXIT_INITIATED') return 3;
    if (activeExit.status === 'CLEARANCE_PENDING') return 4;
    if (activeExit.status === 'PRINCIPAL_PENDING') return 5;
    if (activeExit.status === 'CERTIFICATES_PENDING') return 6;
    return 6;
  }, [selectedStudentId, activeExit]);

  const loadActiveExit = useCallback(async (studentId: number) => {
    setLoadingExit(true);
    try {
      const response = await fetch(`/api/students/exits?student_id=${studentId}&active=true`);
      const data = await response.json();
      if (data.success) {
        setActiveExit(data.data);
        if (data.data?.certificates) {
          setTransferCertificate(data.data.certificates.transfer_certificate ?? true);
          setCharacterCertificate(data.data.certificates.character_certificate ?? true);
          setBonafide(data.data.certificates.bonafide ?? false);
        }
      } else {
        setActiveExit(null);
      }
    } catch {
      setActiveExit(null);
    } finally {
      setLoadingExit(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (historySearch) params.set('search', historySearch);
      if (historyStatus) params.set('status', historyStatus);
      const response = await fetch(`/api/students/exits?${params}`);
      const data = await response.json();
      if (data.success) {
        setHistoryItems(data.data.items || []);
      }
    } catch (error) {
      console.error('Error loading exit history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [historySearch, historyStatus]);

  useEffect(() => {
    fetch('/api/settings/reports')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setReportSettings(d.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setClasses(d.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (classFilter && classFilter !== UNASSIGNED_CLASS_FILTER) {
      fetch(`/api/sections?class_id=${classFilter}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setSections(d.data);
        })
        .catch(console.error);
    } else {
      setSections([]);
      setSectionFilter('');
    }
  }, [classFilter]);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const params = new URLSearchParams({
          search,
          limit: String(STUDENTS_FETCH_LIMIT),
          page: '1',
          status: 'active',
        });
        if (classFilter) params.set('class_id', classFilter);
        if (sectionFilter && classFilter !== UNASSIGNED_CLASS_FILTER) {
          params.set('section_id', sectionFilter);
        }
        const response = await fetch(`/api/students?${params}`);
        const data = await response.json();
        if (data.success) setStudents(data.data);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [search, classFilter, sectionFilter]);

  useEffect(() => {
    if (selectedStudentId) {
      void loadActiveExit(selectedStudentId);
      setPickerExpanded(false);
    } else {
      setActiveExit(null);
    }
  }, [selectedStudentId, loadActiveExit]);

  useEffect(() => {
    if (activeTab === 'history') {
      void loadHistory();
    }
  }, [activeTab, loadHistory]);

  const handleSelectStudent = (studentId: number) => {
    setSelectedStudentId((prev) => (prev === studentId ? null : studentId));
  };

  const handleInitiateExit = async () => {
    if (!selectedStudentId) return;
    const proceed = await confirm(
      'Initiate exit for this student? This will start the clearance workflow.',
      { title: 'Initiate exit', type: 'warning', confirmText: 'Initiate' }
    );
    if (!proceed) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/students/exits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentId,
          exit_reason_code: exitReasonCode,
          exit_date: exitDate,
          remarks,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setActiveExit(data.data);
        await alert('Exit initiated. Proceed with department clearance.', {
          title: 'Exit initiated',
          type: 'success',
        });
      } else {
        await alert(data.error || 'Failed to initiate exit', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to initiate exit', { title: 'Error', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const patchExit = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!activeExit) return;
    setActionLoading(action);
    try {
      const response = await fetch(`/api/students/exits/${activeExit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await response.json();
      if (data.success) {
        setActiveExit(data.data);
        return true;
      }
      await alert(data.error || 'Action failed', { title: 'Error', type: 'error' });
      return false;
    } catch {
      await alert('Action failed', { title: 'Error', type: 'error' });
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveClearance = async (department: string) => {
    await patchExit('approve_clearance', { department });
  };

  const handlePrincipalApprove = async () => {
    const ok = await patchExit('principal_approve');
    if (ok) {
      await alert('Principal approval recorded.', { title: 'Approved', type: 'success' });
    }
  };

  const handleSaveCertificates = async () => {
    await patchExit('update_certificates', {
      transfer_certificate: transferCertificate,
      character_certificate: characterCertificate,
      bonafide,
    });
  };

  const handleCompleteExit = async () => {
    const proceed = await confirm(
      'Complete exit? The student will be marked as exited and removed from active lists.',
      { title: 'Complete exit', type: 'warning', confirmText: 'Complete exit' }
    );
    if (!proceed) return;

    await handleSaveCertificates();
    const ok = await patchExit('complete');
    if (ok) {
      await alert('Student exit completed successfully.', { title: 'Exit completed', type: 'success' });
      setSelectedStudentId(null);
      setActiveExit(null);
      setStudents((prev) => prev.filter((s) => s.id !== selectedStudentId));
    }
  };

  const handleCancelExit = async () => {
    const proceed = await confirm('Cancel this exit process?', {
      title: 'Cancel exit',
      type: 'warning',
      confirmText: 'Cancel exit',
    });
    if (!proceed) return;
    const ok = await patchExit('cancel');
    if (ok) {
      setActiveExit(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {/* <Link
              href="/students"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1"
            >
              <FiArrowLeft size={14} />
              Back to Students
            </Link> */}
            <h1 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              {/* <FiUserMinus className="text-primary-600" /> */}
              Exit Student
            </h1>
            {/* <p className="text-sm text-gray-500 mt-0.5">
              Initiate exit, run clearance checks, and complete student withdrawal.
            </p> */}
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('process')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'process'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Process Exit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'history'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Exit History
          </button>
        </div>

        {activeTab === 'process' ? (
          <div className="space-y-4">
            <ExitStepIndicator currentStep={currentStep} />

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setPickerExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedStudent
                      ? `Selected: ${studentFullName(selectedStudent)}`
                      : 'Search & select student'}
                  </p>
                  {selectedStudent && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedStudent.class_name || '—'}
                      {selectedStudent.section_name ? ` · ${selectedStudent.section_name}` : ''}
                    </p>
                  )}
                </div>
                {pickerExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
              </button>

              {pickerExpanded && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative md:col-span-2">
                      <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, admission no., phone..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">All Classes</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                      disabled={!classFilter || classFilter === UNASSIGNED_CLASS_FILTER}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
                    >
                      <option value="">All Sections</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border rounded-lg overflow-hidden" style={{ height: 320 }}>
                    {loadingStudents ? (
                      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                        Loading students…
                      </div>
                    ) : (
                      <VirtualizedStudentSelectTable
                        students={students}
                        selectedIds={
                          selectedStudentId ? new Set([selectedStudentId]) : new Set()
                        }
                        onToggle={handleSelectStudent}
                        onToggleAll={() => undefined}
                        fillHeight
                        maxSelection={1}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedStudent && !activeExit && !loadingExit && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-4">
                <h2 className="text-sm font-semibold text-gray-900">Step 2 — Initiate Exit</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                    <select
                      value={exitReasonCode}
                      onChange={(e) => setExitReasonCode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {EXIT_REASONS.map((reason) => (
                        <option key={reason.code} value={reason.code}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Exit Date</label>
                    <input
                      type="date"
                      value={exitDate}
                      onChange={(e) => setExitDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      placeholder="Optional notes about this exit..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleInitiateExit}
                  disabled={submitting}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Initiating…' : 'Initiate Exit'}
                </button>
              </div>
            )}

            {loadingExit && selectedStudent && (
              <div className="bg-white border rounded-lg p-8 text-center text-gray-500 text-sm">
                Loading exit workflow…
              </div>
            )}

            {activeExit && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {(activeExit.student_snapshot as { full_name?: string }).full_name ||
                          studentFullName(selectedStudent!)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {activeExit.exit_reason_label} · Exit date{' '}
                        {new Date(activeExit.exit_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadgeClass(activeExit.status)}`}
                    >
                      {EXIT_STATUS_LABELS[activeExit.status]}
                    </span>
                  </div>
                  {activeExit.remarks && (
                    <p className="text-sm text-gray-600 mt-2 border-t pt-2">{activeExit.remarks}</p>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">
                    Step 3 — System Validation
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeExit.validation_snapshot.items.map((item) => (
                      <div
                        key={item.department}
                        className={`rounded-lg border px-3 py-2.5 ${validationStatusClass(item.status)}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            {item.label}
                          </span>
                          {item.status === 'cleared' ? (
                            <FiCheckCircle size={14} />
                          ) : item.status === 'pending' ? (
                            <FiClock size={14} />
                          ) : null}
                        </div>
                        <p className="text-sm mt-1">{item.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {activeExit.status === 'EXIT_INITIATED' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => patchExit('start_clearance')}
                      disabled={actionLoading === 'start_clearance'}
                      className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
                    >
                      {actionLoading === 'start_clearance'
                        ? 'Starting…'
                        : 'Generate Clearance'}
                    </button>
                  </div>
                )}

                {(activeExit.status === 'CLEARANCE_PENDING' ||
                  activeExit.status === 'PRINCIPAL_PENDING' ||
                  activeExit.status === 'CERTIFICATES_PENDING') && (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">
                      Step 4 — Department Clearance
                    </h2>
                    <div className="space-y-2">
                      {CLEARANCE_DEPARTMENTS.map((dept) => {
                        const item = activeExit.clearance[dept.key];
                        const isApproved =
                          item?.status === 'approved' || item?.status === 'not_applicable';
                        const validationItem = activeExit.validation_snapshot.items.find(
                          (v) => v.department === dept.key
                        );
                        return (
                          <div
                            key={dept.key}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{dept.label}</p>
                              <p className="text-xs text-gray-500">
                                {validationItem?.summary || '—'}
                              </p>
                              {item?.approved_by_name && (
                                <p className="text-xs text-green-700 mt-0.5">
                                  Approved by {item.approved_by_name}
                                </p>
                              )}
                            </div>
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                                <FiCheck size={14} /> Cleared
                              </span>
                            ) : activeExit.status === 'CLEARANCE_PENDING' ? (
                              <button
                                type="button"
                                onClick={() => handleApproveClearance(dept.key)}
                                disabled={actionLoading === 'approve_clearance'}
                                className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                              >
                                Approve
                              </button>
                            ) : (
                              <span className="text-xs text-amber-600">Pending</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeExit.status === 'PRINCIPAL_PENDING' && (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                    <h2 className="text-sm font-semibold text-gray-900 mb-2">
                      Step 5 — Principal Approval
                    </h2>
                    <p className="text-sm text-gray-600 mb-3">
                      All departments have cleared. Principal approval is required before generating
                      certificates.
                    </p>
                    <button
                      type="button"
                      onClick={handlePrincipalApprove}
                      disabled={!canPrincipalApprove || actionLoading === 'principal_approve'}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                    >
                      {actionLoading === 'principal_approve' ? 'Approving…' : 'Approve Exit'}
                    </button>
                    {!canPrincipalApprove && (
                      <p className="text-xs text-amber-600 mt-2">
                        Only admin or super admin can approve as principal.
                      </p>
                    )}
                  </div>
                )}

                {activeExit.status === 'CERTIFICATES_PENDING' && (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-900">
                      Step 6 — Generate Certificates & Complete
                    </h2>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={transferCertificate}
                          onChange={(e) => setTransferCertificate(e.target.checked)}
                        />
                        Transfer Certificate
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={characterCertificate}
                          onChange={(e) => setCharacterCertificate(e.target.checked)}
                        />
                        Character Certificate
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={bonafide}
                          onChange={(e) => setBonafide(e.target.checked)}
                        />
                        Bonafide (optional)
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {transferCertificate && selectedStudent && (
                        <button
                          type="button"
                          onClick={() => setShowTcModal(true)}
                          className="border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
                        >
                          <FiFileText size={15} />
                          Generate Transfer Certificate
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCompleteExit}
                        disabled={actionLoading === 'complete'}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-2"
                      >
                        <FiCheckCircle size={15} />
                        {actionLoading === 'complete' ? 'Completing…' : 'Complete Exit'}
                      </button>
                    </div>
                    {activeExit.principal_approved_by_name && (
                      <p className="text-xs text-gray-500">
                        Principal approved by {activeExit.principal_approved_by_name} on{' '}
                        {formatDateTime(activeExit.principal_approved_at)}
                      </p>
                    )}
                  </div>
                )}

                {activeExit.status !== 'EXITED' && activeExit.status !== 'CANCELLED' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleCancelExit}
                      disabled={actionLoading === 'cancel'}
                      className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                    >
                      <FiXCircle size={14} />
                      Cancel exit process
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search student, admission no..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <select
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All statuses</option>
                {Object.entries(EXIT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void loadHistory()}
                className="border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
              >
                <FiRefreshCw size={14} />
                Refresh
              </button>
            </div>

            {historyLoading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading history…</div>
            ) : historyItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No exit records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Student</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Reason</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Exit Date</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Initiated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <p className="font-medium text-gray-900">
                            {(item.student_snapshot as { full_name?: string }).full_name || '—'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(item.student_snapshot as { admission_number?: string }).admission_number ||
                              '—'}
                          </p>
                        </td>
                        <td className="px-4 py-2">{item.exit_reason_label}</td>
                        <td className="px-4 py-2">
                          {new Date(item.exit_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadgeClass(item.status)}`}
                          >
                            {EXIT_STATUS_LABELS[item.status]}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-500">
                          {formatDateTime(item.initiated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedStudent && (
        <TransferCertificateModal
          isOpen={showTcModal}
          onClose={() => setShowTcModal(false)}
          students={[selectedStudent]}
          school={tcSchoolInfo}
        />
      )}
    </DashboardLayout>
  );
}
