'use client';

import AppModal from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import VirtualizedStudentSelectTable from '@/features/students/components/VirtualizedStudentSelectTable';
import { usePreselectGatePassStudentFromUrl } from '@/features/students/hooks/usePreselectStudentFromUrl';
import CollectorCameraModal from '@/features/students/components/CollectorCameraModal';
import GatePassDocument from '@/features/students/components/GatePassDocument';
import { printGatePassViaIframe } from '@/features/students/utils/gate-pass-print';
import { GATE_PASS_APPROVAL_LABELS, GATE_PASS_APPROVER_ROLES } from '@/lib/gate-pass-utils';
import type { GatePassGuardianPhoto } from '@/lib/gate-pass-utils';
import { getClientUser, getClientToken } from '@/lib/client-auth';
import { getUserFromToken, hasRole } from '@/lib/auth';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import type { Student } from '@/shared/types';
import { studentFullName } from '@/features/students/utils/student-profile';
import {
  FiArrowLeft,
  FiCamera,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiFileText,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiX,
} from 'react-icons/fi';

const STUDENTS_FETCH_LIMIT = 50000;
const UNASSIGNED_CLASS_FILTER = 'unassigned';

interface ClassOption {
  id: number;
  name: string;
  academic_year: string;
}

interface SectionOption {
  id: number;
  class_id: number;
  name: string;
}

const COLLECTOR_RELATIONSHIPS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'relative', label: 'Relative' },
  { value: 'other', label: 'Other' },
];

interface GuardianContact {
  label: string;
  name: string;
  mobile: string;
  source: string;
}

interface GatePassRecord {
  id: number;
  pass_number: string;
  student_id: number;
  student_snapshot: {
    full_name?: string;
    admission_number?: string;
    class_name?: string;
    section_name?: string;
    photo_url?: string | null;
    guardian_photos?: GatePassGuardianPhoto[];
  };
  collector_name: string;
  collector_mobile: string;
  collector_relationship: string;
  collector_photo_url?: string | null;
  reason: string;
  approval_method?: string | null;
  otp_sent_to_mobile?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  exit_at?: string | null;
  status: string;
  created_by_name?: string | null;
  created_at: string;
  notes?: string | null;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function relationshipLabel(value: string) {
  return COLLECTOR_RELATIONSHIPS.find((r) => r.value === value)?.label || value;
}

function GatePassStepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { num: 1 as const, label: 'Select student' },
    { num: 2 as const, label: 'Collector details' },
    { num: 3 as const, label: 'Authorize exit' },
  ];

  return (
    <ol className="flex flex-wrap items-center gap-1 sm:gap-2 rounded-lg border border-gray-200 bg-gray-50/80 p-2 sm:p-3">
      {steps.map((s, index) => {
        const done = step > s.num;
        const active = step === s.num;
        return (
          <li key={s.num} className="flex items-center min-w-0">
            <div
              className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs sm:text-sm transition-colors ${
                active
                  ? 'bg-primary-100 text-primary-800 font-semibold'
                  : done
                    ? 'text-primary-700'
                    : 'text-gray-400'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active || done ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? <FiCheckCircle size={14} /> : s.num}
              </span>
              <span className="truncate">{s.label}</span>
            </div>
            {index < steps.length - 1 && (
              <span className="mx-1 sm:mx-2 hidden sm:block h-px w-6 bg-gray-300 shrink-0" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function readGatePassAdminAccess(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = getClientUser();
  const tokenUser = getUserFromToken(getClientToken() || '');
  const role = String(stored?.role || tokenUser?.role || '');
  return hasRole(role, [...GATE_PASS_APPROVER_ROLES]);
}

export default function GatePassPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        </DashboardLayout>
      }
    >
      <GatePassPageContent />
    </Suspense>
  );
}

function GatePassPageContent() {
  const { alert, confirm } = useDialog();
  const { settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const collectorStepRef = useRef<HTMLDivElement>(null);
  const [studentPickerExpanded, setStudentPickerExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'issue' | 'history'>('issue');
  const [canStaffApprove, setCanStaffApprove] = useState(false);

  // Issue flow
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [guardianContacts, setGuardianContacts] = useState<GuardianContact[]>([]);
  const [selectedGuardianMobile, setSelectedGuardianMobile] = useState('');
  const [collectorName, setCollectorName] = useState('');
  const [collectorMobile, setCollectorMobile] = useState('');
  const [collectorRelationship, setCollectorRelationship] = useState('guardian');
  const [collectorPhotoUrl, setCollectorPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [reason, setReason] = useState('');
  const [pendingPass, setPendingPass] = useState<GatePassRecord | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [staffApproving, setStaffApproving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // History
  const [history, setHistory] = useState<GatePassRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');
  const [historySearchInput, setHistorySearchInput] = useState('');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<GatePassRecord | null>(null);
  const [recordDetailLoading, setRecordDetailLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GatePassRecord | null>(null);
  const [editCollectorName, setEditCollectorName] = useState('');
  const [editCollectorMobile, setEditCollectorMobile] = useState('');
  const [editCollectorRelationship, setEditCollectorRelationship] = useState('guardian');
  const [editCollectorPhotoUrl, setEditCollectorPhotoUrl] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editPhotoUploading, setEditPhotoUploading] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'issue' | 'edit'>('issue');
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const historyLimit = 20;

  const viewRecordDetail = useCallback(async (row: GatePassRecord) => {
    setSelectedRecord(row);
    setRecordDetailLoading(true);
    try {
      const res = await fetch(`/api/students/gate-passes/${row.id}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedRecord(json.data);
      }
    } catch {
      // keep list row data on failure
    } finally {
      setRecordDetailLoading(false);
    }
  }, []);

  const openEditRecord = useCallback(async (row: GatePassRecord) => {
    try {
      const res = await fetch(`/api/students/gate-passes/${row.id}`, { credentials: 'include' });
      const json = await res.json();
      const record = json.success && json.data ? (json.data as GatePassRecord) : row;
      setEditingRecord(record);
      setEditCollectorName(record.collector_name);
      setEditCollectorMobile(record.collector_mobile);
      setEditCollectorRelationship(record.collector_relationship || 'guardian');
      setEditCollectorPhotoUrl(record.collector_photo_url || '');
      setEditReason(record.reason);
      setEditNotes(record.notes || '');
    } catch {
      setEditingRecord(row);
      setEditCollectorName(row.collector_name);
      setEditCollectorMobile(row.collector_mobile);
      setEditCollectorRelationship(row.collector_relationship || 'guardian');
      setEditCollectorPhotoUrl(row.collector_photo_url || '');
      setEditReason(row.reason);
      setEditNotes(row.notes || '');
    }
  }, []);

  const closeEditRecord = () => {
    setEditingRecord(null);
    setEditSaving(false);
    setEditPhotoUploading(false);
  };

  const handleEditPhotoUpload = async (file: File) => {
    setEditPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload?folder=gate-pass', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setEditCollectorPhotoUrl(json.data.url);
        setShowCameraModal(false);
      } else {
        await alert(json.error || 'Photo upload failed', { title: 'Upload error', type: 'error' });
      }
    } catch {
      await alert('Photo upload failed', { title: 'Error', type: 'error' });
    } finally {
      setEditPhotoUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    if (!editReason.trim()) {
      await alert('Reason is required.', { title: 'Missing fields', type: 'warning' });
      return;
    }
    if (editingRecord.status === 'pending') {
      if (!editCollectorName.trim() || !editCollectorMobile.trim()) {
        await alert('Collector name and mobile are required.', {
          title: 'Missing fields',
          type: 'warning',
        });
        return;
      }
    }

    setEditSaving(true);
    try {
      const payload: Record<string, string | null> = {
        reason: editReason.trim(),
        notes: editNotes.trim() || null,
      };
      if (editingRecord.status === 'pending') {
        payload.collector_name = editCollectorName.trim();
        payload.collector_mobile = editCollectorMobile.trim();
        payload.collector_relationship = editCollectorRelationship;
        payload.collector_photo_url = editCollectorPhotoUrl || null;
      }

      const res = await fetch(`/api/students/gate-passes/${editingRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        const savedId = editingRecord.id;
        closeEditRecord();
        if (selectedRecord?.id === savedId) {
          setSelectedRecord(json.data);
        }
        if (pendingPass?.id === savedId) {
          setPendingPass(json.data);
        }
        setHistoryRefreshKey((k) => k + 1);
        await alert('Gate pass updated successfully.', { title: 'Saved', type: 'success' });
      } else {
        await alert(json.error || 'Failed to update gate pass', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to update gate pass', { title: 'Error', type: 'error' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteRecord = async (row: GatePassRecord) => {
    const confirmed = await confirm(
      `Delete gate pass ${row.pass_number} for ${row.student_snapshot?.full_name || 'this student'}? This cannot be undone.`,
      { title: 'Delete gate pass', confirmText: 'Delete', type: 'danger' }
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/students/gate-passes/${row.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        if (selectedRecord?.id === row.id) setSelectedRecord(null);
        if (pendingPass?.id === row.id) setPendingPass(null);
        if (editingRecord?.id === row.id) closeEditRecord();
        setHistoryRefreshKey((k) => k + 1);
        await alert('Gate pass deleted.', { title: 'Deleted', type: 'success' });
      } else {
        await alert(json.error || 'Failed to delete gate pass', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to delete gate pass', { title: 'Error', type: 'error' });
    }
  };

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  usePreselectGatePassStudentFromUrl(
    students,
    setSelectedStudentId,
    setStudentPickerExpanded,
    setActiveTab,
  );

  const issueStep: 1 | 2 | 3 = pendingPass ? 3 : selectedStudent ? 2 : 1;

  useEffect(() => {
    if (selectedStudentId && !pendingPass) {
      setStudentPickerExpanded(false);
      const timer = window.setTimeout(() => {
        collectorStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return () => window.clearTimeout(timer);
    }
    if (!selectedStudentId) {
      setStudentPickerExpanded(true);
    }
  }, [selectedStudentId, pendingPass]);

  useEffect(() => {
    setCanStaffApprove(readGatePassAdminAccess());
  }, []);

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setClasses(json.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (classFilter && classFilter !== UNASSIGNED_CLASS_FILTER) {
      fetch(`/api/sections?class_id=${classFilter}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setSections(json.data);
        })
        .catch(console.error);
    } else {
      setSections([]);
      setSectionFilter('');
    }
  }, [classFilter]);

  useEffect(() => {
    const fetchStudents = async () => {
      setStudentsLoading(true);
      try {
        const params = new URLSearchParams({
          search: studentSearch,
          limit: String(STUDENTS_FETCH_LIMIT),
          page: '1',
        });
        if (classFilter) params.set('class_id', classFilter);
        if (sectionFilter && classFilter !== UNASSIGNED_CLASS_FILTER) {
          params.set('section_id', sectionFilter);
        }
        const res = await fetch(`/api/students?${params}`);
        const json = await res.json();
        if (json.success) setStudents(json.data);
      } catch (error) {
        console.error(error);
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
  }, [studentSearch, classFilter, sectionFilter]);

  useEffect(() => {
    if (!selectedStudentId) {
      setGuardianContacts([]);
      setSelectedGuardianMobile('');
      return;
    }
    fetch(`/api/students/gate-passes/guardian-contacts?student_id=${selectedStudentId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setGuardianContacts(json.data);
          setSelectedGuardianMobile(json.data[0]?.mobile || '');
        }
      })
      .catch(console.error);
  }, [selectedStudentId]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: String(historyLimit),
      });
      if (historySearch) params.set('search', historySearch);

      const res = await fetch(`/api/students/gate-passes?${params}`);
      const json = await res.json();
      if (json.success) {
        setHistory(json.data.items);
        setHistoryTotal(json.data.total);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historySearch]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory, historyRefreshKey]);

  const toggleStudent = (id: number) => {
    setSelectedStudentId((prev) => {
      const next = prev === id ? null : id;
      setStudentPickerExpanded(next === null);
      return next;
    });
    setPendingPass(null);
    setOtpCode('');
  };

  const toggleAllStudents = (ids: number[], select: boolean) => {
    if (!select) {
      setSelectedStudentId(null);
      setStudentPickerExpanded(true);
      return;
    }
    if (ids.length > 0) {
      setSelectedStudentId(ids[0]);
      setStudentPickerExpanded(false);
    }
  };

  const selectedIds = useMemo(
    () => (selectedStudentId ? new Set([selectedStudentId]) : new Set<number>()),
    [selectedStudentId]
  );

  const schoolInfo = useMemo(
    () => ({
      name: settings.school_name || 'School',
      logoUrl: settings.logo_url || undefined,
      address: settings.school_address || undefined,
      phone: settings.school_phone || undefined,
      email: settings.school_email || undefined,
      academicYear: settings.academic_year || undefined,
    }),
    [settings]
  );

  const handlePhotoUpload = async (file: File) => {
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload?folder=gate-pass', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setCollectorPhotoUrl(json.data.url);
        setShowCameraModal(false);
      } else {
        await alert(json.error || 'Photo upload failed', { title: 'Upload error', type: 'error' });
      }
    } catch {
      await alert('Photo upload failed', { title: 'Error', type: 'error' });
    } finally {
      setPhotoUploading(false);
    }
  };

  const resetIssueForm = () => {
    setPendingPass(null);
    setOtpCode('');
    setCollectorName('');
    setCollectorMobile('');
    setCollectorRelationship('guardian');
    setCollectorPhotoUrl('');
    setReason('');
  };

  const handleCreatePass = async () => {
    if (!selectedStudent) {
      await alert('Select a student first.', { title: 'Student required', type: 'warning' });
      return;
    }
    if (!collectorName.trim() || !collectorMobile.trim() || !reason.trim()) {
      await alert('Collector name, mobile, and reason are required.', {
        title: 'Missing fields',
        type: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/students/gate-passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          collector_name: collectorName.trim(),
          collector_mobile: collectorMobile.trim(),
          collector_relationship: collectorRelationship,
          collector_photo_url: collectorPhotoUrl || null,
          reason: reason.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPendingPass(json.data);
        await alert(`Gate pass ${json.data.pass_number} created. Complete OTP or staff approval.`, {
          title: 'Gate pass created',
          type: 'success',
        });
      } else {
        await alert(json.error || 'Failed to create gate pass', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to create gate pass', { title: 'Error', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (!pendingPass) return;
    if (!selectedGuardianMobile) {
      await alert('Select a registered parent/guardian mobile for OTP.', {
        title: 'Guardian mobile required',
        type: 'warning',
      });
      return;
    }
    setOtpSending(true);
    try {
      const res = await fetch(`/api/students/gate-passes/${pendingPass.id}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardian_mobile: selectedGuardianMobile }),
      });
      const json = await res.json();
      if (json.success) {
        await alert(json.data.message, { title: 'OTP sent', type: 'success' });
      } else {
        await alert(json.error || 'Failed to send OTP', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to send OTP', { title: 'Error', type: 'error' });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!pendingPass || !otpCode.trim()) return;
    setOtpVerifying(true);
    try {
      const res = await fetch(`/api/students/gate-passes/${pendingPass.id}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        await alert('Gate pass approved. Student exit recorded.', {
          title: 'Approved',
          type: 'success',
        });
        resetIssueForm();
        setSelectedStudentId(null);
        setActiveTab('history');
      } else {
        await alert(json.error || 'Invalid OTP', { title: 'Verification failed', type: 'error' });
      }
    } catch {
      await alert('OTP verification failed', { title: 'Error', type: 'error' });
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleStaffApprove = async () => {
    if (!pendingPass) return;
    const confirmed = await confirm(
      'Parent/guardian could not be reached. Approve this gate pass as authorized school staff?',
      { title: 'Staff approval', type: 'warning', confirmText: 'Approve' }
    );
    if (!confirmed) return;

    setStaffApproving(true);
    try {
      const res = await fetch(`/api/students/gate-passes/${pendingPass.id}/staff-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        await alert('Gate pass approved by school authority. Student exit recorded.', {
          title: 'Approved',
          type: 'success',
        });
        resetIssueForm();
        setSelectedStudentId(null);
        setActiveTab('history');
      } else {
        await alert(json.error || 'Approval failed', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Approval failed', { title: 'Error', type: 'error' });
    } finally {
      setStaffApproving(false);
    }
  };

  const historyPages = Math.max(1, Math.ceil(historyTotal / historyLimit));

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <Link
            href="/students"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-1"
          >
            <FiArrowLeft size={14} /> Students
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FiShield className="text-primary-600" />
            Gate Pass Exit
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Authorize early student exit with parent OTP or principal/staff approval. Full audit
            trail maintained.
          </p>
        </div>

        <div className="flex gap-2 border-b">
          {(['issue', 'history'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab === 'issue' ? 'Issue Gate Pass' : 'Gate Pass History'}
            </button>
          ))}
        </div>

        {activeTab === 'issue' && (
          <div className="space-y-4">
            {!pendingPass ? (
              <>
                <GatePassStepIndicator step={issueStep} />

                <div className="bg-white border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          selectedStudent
                            ? 'bg-primary-600 text-white'
                            : 'bg-primary-100 text-primary-700'
                        }`}
                      >
                        {selectedStudent ? <FiCheckCircle size={14} /> : '1'}
                      </span>
                      Select student
                    </h2>
                    {selectedStudent && !studentPickerExpanded && (
                      <button
                        type="button"
                        onClick={() => setStudentPickerExpanded(true)}
                        className="text-xs sm:text-sm text-primary-600 hover:text-primary-800 font-medium shrink-0"
                      >
                        Change student
                      </button>
                    )}
                  </div>

                  {selectedStudent && !studentPickerExpanded ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50 px-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-primary-900 truncate">
                          {studentFullName(selectedStudent)}
                        </p>
                        <p className="text-xs text-primary-700 font-mono">
                          {selectedStudent.admission_number}
                          {selectedStudent.class_name
                            ? ` · ${selectedStudent.class_name}${selectedStudent.section_name ? ` - ${selectedStudent.section_name}` : ''}`
                            : ''}
                        </p>
                      </div>
                      <p className="text-xs text-primary-600 font-medium">
                        Step 2 below ↓
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 items-end">
                    <div className="relative flex-1 min-w-[180px]">
                      <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search student..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                      />
                    </div>
                    <label className="block text-sm min-w-[140px]">
                      <span className="text-gray-600 text-xs">Class</span>
                      <select
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
                        value={classFilter}
                        onChange={(e) => {
                          setClassFilter(e.target.value);
                          setSectionFilter('');
                          setSelectedStudentId(null);
                          setPendingPass(null);
                        }}
                      >
                        <option value="">All classes</option>
                        <option value={UNASSIGNED_CLASS_FILTER}>Unassigned</option>
                        {classes.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm min-w-[140px]">
                      <span className="text-gray-600 text-xs">Section</span>
                      <select
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50"
                        value={sectionFilter}
                        disabled={!classFilter || classFilter === UNASSIGNED_CLASS_FILTER}
                        onChange={(e) => {
                          setSectionFilter(e.target.value);
                          setSelectedStudentId(null);
                          setPendingPass(null);
                        }}
                      >
                        <option value="">All sections</option>
                        {sections.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {(studentSearch || classFilter || sectionFilter) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentSearch('');
                          setClassFilter('');
                          setSectionFilter('');
                          setSelectedStudentId(null);
                          setPendingPass(null);
                          setStudentPickerExpanded(true);
                        }}
                        className="border px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="bg-white rounded-lg border max-h-56 overflow-hidden">
                    {studentsLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin h-8 w-8 border-b-2 border-primary-600 rounded-full" />
                      </div>
                    ) : (
                      <VirtualizedStudentSelectTable
                        students={students}
                        selectedIds={selectedIds}
                        onToggle={toggleStudent}
                        onToggleAll={toggleAllStudents}
                      />
                    )}
                  </div>
                    </>
                  )}
                </div>

                <div
                  ref={collectorStepRef}
                  className={`bg-white border rounded-lg p-4 space-y-4 scroll-mt-4 transition-shadow ${
                    selectedStudent
                      ? 'border-primary-300 ring-2 ring-primary-100 shadow-sm'
                      : 'border-dashed border-gray-300 opacity-75'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          selectedStudent
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        2
                      </span>
                      Person collecting the student
                    </h2>
                    {selectedStudent && (
                      <span className="text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-2.5 py-0.5">
                        For {studentFullName(selectedStudent)}
                      </span>
                    )}
                  </div>

                  {!selectedStudent ? (
                    <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-3">
                      Select a student in step 1 first. The collector form will unlock here
                      automatically.
                    </p>
                  ) : (
                    <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block text-sm">
                      <span className="text-gray-700">Collector name *</span>
                      <input
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        value={collectorName}
                        onChange={(e) => setCollectorName(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-gray-700">Collector mobile *</span>
                      <input
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        value={collectorMobile}
                        onChange={(e) => setCollectorMobile(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-gray-700">Relationship *</span>
                      <select
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        value={collectorRelationship}
                        onChange={(e) => setCollectorRelationship(e.target.value)}
                      >
                        {COLLECTOR_RELATIONSHIPS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm md:col-span-2">
                      <span className="text-gray-700">Reason for early departure *</span>
                      <textarea
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Medical appointment, family emergency..."
                      />
                    </label>
                  </div>

                  <div>
                    <p className="text-sm text-gray-700 mb-2">Collector photo</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCameraTarget('issue');
                          setShowCameraModal(true);
                        }}
                        disabled={photoUploading}
                        className="inline-flex h-10 items-center gap-2 bg-primary-600 text-white px-4 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                      >
                        <FiCamera size={16} />
                        Open camera
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={photoUploading}
                        className="inline-flex h-10 items-center border px-4 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        {photoUploading ? 'Uploading...' : 'Upload from device'}
                      </button>
                      {collectorPhotoUrl && (
                        <img
                          src={collectorPhotoUrl}
                          alt="Collector"
                          className="h-20 w-20 shrink-0 rounded-lg object-cover border border-gray-200"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleCreatePass}
                      disabled={submitting || !selectedStudent}
                      className="inline-flex h-10 items-center bg-primary-600 text-white px-5 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40"
                    >
                      {submitting ? 'Creating...' : 'Create Gate Pass & Authorize'}
                    </button>
                  </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4 flex flex-col items-center">
                <GatePassStepIndicator step={3} />
                <GatePassDocument
                  record={{
                    ...pendingPass,
                    collector_photo_url: pendingPass.collector_photo_url || collectorPhotoUrl || null,
                  }}
                  school={schoolInfo}
                />

                <div className="bg-white border rounded-lg p-4 space-y-4 w-full">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Authorization required</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Complete OTP verification or staff approval to record exit time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingPass(null);
                      setOtpCode('');
                    }}
                    className="text-gray-500 hover:text-gray-800 p-1"
                    aria-label="Cancel"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                <div className="border rounded-lg p-4 space-y-3 bg-blue-50/50">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FiUser size={16} /> Parent / Guardian OTP
                  </h3>
                  {guardianContacts.length === 0 ? (
                    <p className="text-sm text-amber-700">
                      No registered guardian mobile found. Use staff approval below.
                    </p>
                  ) : (
                    <>
                      <label className="block text-sm">
                        <span className="text-gray-700">Send OTP to registered mobile</span>
                        <select
                          className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
                          value={selectedGuardianMobile}
                          onChange={(e) => setSelectedGuardianMobile(e.target.value)}
                        >
                          {guardianContacts.map((c) => (
                            <option key={c.mobile} value={c.mobile}>
                              {c.label} — {c.mobile}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpSending}
                        className="border bg-white px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        {otpSending ? 'Sending OTP...' : 'Send OTP via SMS (2factor)'}
                      </button>
                      <div className="flex flex-wrap gap-2 items-end">
                        <label className="text-sm flex-1 min-w-[140px]">
                          <span className="text-gray-700">Enter OTP</span>
                          <input
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm tracking-widest"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            maxLength={6}
                            inputMode="numeric"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={otpVerifying || !otpCode.trim()}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-40 flex items-center gap-2"
                        >
                          <FiCheckCircle size={16} />
                          {otpVerifying ? 'Verifying...' : 'Verify & Record Exit'}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {canStaffApprove && (
                  <div className="border rounded-lg p-4 space-y-2 bg-amber-50/50">
                    <h3 className="text-sm font-semibold text-gray-900">Principal / Authorized staff</h3>
                    <p className="text-xs text-gray-600">
                      Use only when parent/guardian cannot be reached. Exit time will be recorded
                      immediately.
                    </p>
                    <button
                      type="button"
                      onClick={handleStaffApprove}
                      disabled={staffApproving}
                      className="border border-amber-300 bg-white px-4 py-2 rounded-lg text-sm hover:bg-amber-50 disabled:opacity-50"
                    >
                      {staffApproving ? 'Approving...' : 'Approve without OTP (Staff)'}
                    </button>
                  </div>
                )}
              </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <form
                className="flex gap-2 flex-1 min-w-[200px] max-w-md"
                onSubmit={(e) => {
                  e.preventDefault();
                  setHistorySearch(historySearchInput.trim());
                  setHistoryPage(1);
                }}
              >
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                    placeholder="Search pass no., student, collector..."
                    value={historySearchInput}
                    onChange={(e) => setHistorySearchInput(e.target.value)}
                  />
                </div>
              </form>
              <button
                type="button"
                onClick={fetchHistory}
                className="border px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50"
              >
                <FiRefreshCw size={15} /> Refresh
              </button>
            </div>

            <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Exit time</th>
                    <th className="px-4 py-3 font-medium">Pass #</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Collector</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                    <th className="px-4 py-3 font-medium">Approved by</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                        No gate pass records yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          <span className="flex items-center gap-1">
                            <FiClock size={14} className="text-gray-400" />
                            {formatDateTime(row.exit_at || row.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{row.pass_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{row.student_snapshot?.full_name}</p>
                          <p className="text-xs text-gray-500">
                            {row.student_snapshot?.admission_number}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p>{row.collector_name}</p>
                          <p className="text-xs text-gray-500">{row.collector_mobile}</p>
                        </td>
                        <td className="px-4 py-3 max-w-[180px] truncate" title={row.reason}>
                          {row.reason}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {row.approval_method
                            ? GATE_PASS_APPROVAL_LABELS[row.approval_method] || row.approval_method
                            : '—'}
                          {row.approved_by_name && (
                            <span className="block text-gray-500">{row.approved_by_name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              row.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : row.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => viewRecordDetail(row)}
                              className="p-2 rounded hover:bg-gray-100 text-gray-600"
                              title="View gate pass"
                            >
                              <FiFileText size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditRecord(row)}
                              className="p-2 rounded hover:bg-blue-50 text-blue-600"
                              title="Edit gate pass"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(row)}
                              className="p-2 rounded hover:bg-red-50 text-red-600"
                              title="Delete gate pass"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {historyPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-500">
                  {historyTotal} record{historyTotal !== 1 ? 's' : ''} · Page {historyPage} of{' '}
                  {historyPages}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    className="p-2 border rounded disabled:opacity-40"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={historyPage >= historyPages}
                    onClick={() => setHistoryPage((p) => p + 1)}
                    className="p-2 border rounded disabled:opacity-40"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedRecord && (
        <AppModal open={!!selectedRecord} onClose={() => setSelectedRecord(null)}>
          <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-slate-100 shadow-xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-slate-100/95 backdrop-blur border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">
                Gate Pass
                {recordDetailLoading ? (
                  <span className="ml-2 text-xs font-normal text-slate-500">Loading photos…</span>
                ) : null}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const record = selectedRecord;
                    setSelectedRecord(null);
                    if (record) openEditRecord(record);
                  }}
                  className="flex items-center gap-2 border bg-white px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
                >
                  <FiEdit2 size={15} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => printGatePassViaIframe(selectedRecord, schoolInfo)}
                  className="flex items-center gap-2 border bg-white px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
                >
                  <FiPrinter size={15} />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-white"
                  aria-label="Close"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <GatePassDocument record={selectedRecord} school={schoolInfo} />
            </div>
          </div>
        </AppModal>
      )}

      {editingRecord && (
        <AppModal open={!!editingRecord} onClose={closeEditRecord}>
          <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b px-4 py-3 bg-white">
              <div>
                <p className="text-sm font-semibold text-gray-900">Edit Gate Pass</p>
                <p className="text-xs text-gray-500 font-mono">{editingRecord.pass_number}</p>
              </div>
              <button
                type="button"
                onClick={closeEditRecord}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="rounded-lg bg-slate-50 border px-3 py-2 text-sm">
                <p className="font-medium">{editingRecord.student_snapshot?.full_name}</p>
                <p className="text-xs text-gray-500">
                  {editingRecord.student_snapshot?.admission_number} · Status:{' '}
                  <span className="font-medium">{editingRecord.status}</span>
                </p>
              </div>

              {editingRecord.status === 'pending' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-sm sm:col-span-2">
                      <span className="text-gray-700">Collector name</span>
                      <input
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        value={editCollectorName}
                        onChange={(e) => setEditCollectorName(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-gray-700">Collector mobile</span>
                      <input
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono"
                        value={editCollectorMobile}
                        onChange={(e) => setEditCollectorMobile(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-gray-700">Relationship</span>
                      <select
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        value={editCollectorRelationship}
                        onChange={(e) => setEditCollectorRelationship(e.target.value)}
                      >
                        {COLLECTOR_RELATIONSHIPS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div>
                    <p className="text-sm text-gray-700 mb-2">Collector photo</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraTarget('edit');
                          setShowCameraModal(true);
                        }}
                        disabled={editPhotoUploading}
                        className="border px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <FiCamera size={15} />
                        Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        disabled={editPhotoUploading}
                        className="border px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        {editPhotoUploading ? 'Uploading...' : 'Upload'}
                      </button>
                      {editCollectorPhotoUrl && (
                        <img
                          src={editCollectorPhotoUrl}
                          alt="Collector"
                          className="h-16 w-16 rounded-lg object-cover border"
                        />
                      )}
                    </div>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleEditPhotoUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  This gate pass is {editingRecord.status}. Only reason and notes can be edited.
                </p>
              )}

              <label className="block text-sm">
                <span className="text-gray-700">Reason for early departure</span>
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                />
              </label>

              <label className="block text-sm">
                <span className="text-gray-700">Internal notes (optional)</span>
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[60px]"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Staff notes..."
                />
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={closeEditRecord}
                  className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={editSaving}
                  className="px-4 py-2 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </AppModal>
      )}

      <CollectorCameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={(file) =>
          cameraTarget === 'edit' ? handleEditPhotoUpload(file) : handlePhotoUpload(file)
        }
        uploading={cameraTarget === 'edit' ? editPhotoUploading : photoUploading}
      />
    </DashboardLayout>
  );
}
