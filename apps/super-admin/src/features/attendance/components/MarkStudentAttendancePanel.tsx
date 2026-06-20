'use client';

import React, {
  forwardRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiEdit3,
  FiMoreVertical,
  FiSearch,
  FiSend,
  FiUpload,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';
import { studentFullName, studentInitials } from '@/features/students/utils/student-profile';
import { sortClassesByName } from '@/lib/class-sort';
import { getCalendarDateString } from '@edulakhya/utils';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'on_leave';
type MarkMode = 'manual' | 'bulk';

interface ClassOption {
  id: number;
  name: string;
}

interface SectionOption {
  id: number;
  class_id: number;
  name: string;
}

interface StudentOption {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  admission_number: string;
  roll_number?: string | null;
  photo_url?: string | null;
  class_name?: string;
  section_name?: string;
}

interface StudentMarkRow extends StudentOption {
  status: AttendanceStatus | null;
  selected: boolean;
}

interface MarkStudentAttendancePanelProps {
  classes: ClassOption[];
  variant: 'class' | 'individual';
  onSaved: () => void;
  onCancel?: () => void;
  onSubmitStateChange?: (state: { canSubmit: boolean; saving: boolean }) => void;
}

export type MarkStudentAttendancePanelHandle = {
  submit: () => void;
};

const STATUS_CONFIG: {
  value: AttendanceStatus;
  label: string;
  activeClass: string;
  idleClass: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'present',
    label: 'Present',
    activeClass: 'bg-green-600 text-white border-green-600',
    idleClass: 'text-green-700 border-green-200 hover:bg-green-50',
    icon: <FiCheck size={14} />,
  },
  {
    value: 'absent',
    label: 'Absent',
    activeClass: 'bg-red-600 text-white border-red-600',
    idleClass: 'text-red-700 border-red-200 hover:bg-red-50',
    icon: <FiX size={14} />,
  },
  {
    value: 'late',
    label: 'Late',
    activeClass: 'bg-amber-500 text-white border-amber-500',
    idleClass: 'text-amber-700 border-amber-200 hover:bg-amber-50',
    icon: <FiClock size={14} />,
  },
  {
    value: 'on_leave',
    label: 'On Leave',
    activeClass: 'bg-blue-600 text-white border-blue-600',
    idleClass: 'text-blue-700 border-blue-200 hover:bg-blue-50',
    icon: <FiCalendar size={14} />,
  },
];

function draftKey(date: string, classId: string, sectionId: string) {
  return `attendance-draft:${date}:${classId}:${sectionId}`;
}

function resolveDefaultClassId(classes: ClassOption[]): string {
  const classOne = classes.find((c) => c.name.trim().toLowerCase() === 'class 1');
  const defaultClass = classOne ?? sortClassesByName(classes)[0];
  return defaultClass ? defaultClass.id.toString() : '';
}

function StatusButtons({
  value,
  onChange,
  compact,
}: {
  value: AttendanceStatus | null;
  onChange: (status: AttendanceStatus) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-nowrap gap-1.5 justify-end">
      {STATUS_CONFIG.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1 border rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
              compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
            } ${active ? opt.activeClass : opt.idleClass}`}
          >
            {opt.icon}
            <span className="whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function SubmitAttendanceActions({
  onSaveDraft,
  onSubmit,
  saving,
  canSubmit,
  showSaveDraft = true,
  className = '',
}: {
  onSaveDraft?: () => void;
  onSubmit: () => void;
  saving: boolean;
  canSubmit: boolean;
  showSaveDraft?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-end gap-2 ${className}`}>
      {showSaveDraft && onSaveDraft && (
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={!canSubmit}
          className="border border-gray-200 text-primary-700 bg-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
        >
          Save Draft
        </button>
      )}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || saving}
        className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
      >
        <FiSend size={16} />
        {saving ? 'Submitting...' : 'Submit Attendance'}
      </button>
    </div>
  );
}

const MarkStudentAttendancePanel = forwardRef<
  MarkStudentAttendancePanelHandle,
  MarkStudentAttendancePanelProps
>(function MarkStudentAttendancePanel(
  { classes, variant, onSaved, onCancel, onSubmitStateChange },
  ref
) {
  const { alert, confirm } = useDialog();
  const today = getCalendarDateString();

  const [markDate, setMarkDate] = useState(today);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [markMode, setMarkMode] = useState<MarkMode>('manual');
  const [rows, setRows] = useState<StudentMarkRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('present');
  const [studentSearch, setStudentSearch] = useState('');
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [openActionRowId, setOpenActionRowId] = useState<number | null>(null);
  const moreActionsRef = useRef<HTMLDivElement>(null);

  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [individualStudentId, setIndividualStudentId] = useState('');
  const [individualSearch, setIndividualSearch] = useState('');
  const [individualStatus, setIndividualStatus] = useState<AttendanceStatus>('present');
  const [individualRemarks, setIndividualRemarks] = useState('');
  const [showIndividualDropdown, setShowIndividualDropdown] = useState(false);

  useEffect(() => {
    fetch('/api/students?limit=500&status=active')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setAllStudents(data.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (variant !== 'class' || classId || classes.length === 0) return;
    const defaultId = resolveDefaultClassId(classes);
    if (defaultId) setClassId(defaultId);
  }, [classes, variant, classId]);

  useEffect(() => {
    if (!classId) {
      setSections([]);
      setSectionId('');
      return;
    }
    fetch(`/api/sections?class_id=${classId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSections(data.data);
      })
      .catch(console.error);
  }, [classId]);

  const applyDraft = useCallback(
    (nextRows: StudentMarkRow[]) => {
      if (!classId || typeof window === 'undefined') return nextRows;
      try {
        const raw = localStorage.getItem(draftKey(markDate, classId, sectionId));
        if (!raw) return nextRows;
        const draft = JSON.parse(raw) as Record<string, AttendanceStatus>;
        return nextRows.map((r) =>
          draft[r.id] ? { ...r, status: draft[r.id] } : r
        );
      } catch {
        return nextRows;
      }
    },
    [classId, sectionId, markDate]
  );

  const loadClassStudents = useCallback(async () => {
    if (!classId) {
      setRows([]);
      return;
    }

    setLoadingList(true);
    try {
      const studentParams = new URLSearchParams({
        limit: '500',
        status: 'active',
        class_id: classId,
      });
      if (sectionId) studentParams.append('section_id', sectionId);

      const attendanceParams = new URLSearchParams({
        start_date: markDate,
        end_date: markDate,
        class_id: classId,
      });
      if (sectionId) attendanceParams.append('section_id', sectionId);

      const [studentsRes, attendanceRes] = await Promise.all([
        fetch(`/api/students?${studentParams.toString()}`),
        fetch(`/api/attendance/students?${attendanceParams.toString()}`),
      ]);

      const studentsData = await studentsRes.json();
      const attendanceData = await attendanceRes.json();

      if (!studentsData.success) {
        setRows([]);
        return;
      }

      const existingByStudent = new Map<number, AttendanceStatus>();
      if (attendanceData.success) {
        for (const record of attendanceData.data) {
          existingByStudent.set(record.student_id, record.status as AttendanceStatus);
        }
      }

      let nextRows: StudentMarkRow[] = studentsData.data.map((s: StudentOption) => ({
        ...s,
        status: (existingByStudent.get(s.id) as AttendanceStatus) || null,
        selected: false,
      }));

      nextRows = applyDraft(nextRows);
      setRows(nextRows);
    } catch (error) {
      console.error('Error loading students for marking:', error);
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [classId, sectionId, markDate, applyDraft]);

  useEffect(() => {
    if (variant === 'class') loadClassStudents();
  }, [variant, loadClassStudents]);

  const classCounts = useMemo(() => {
    const present = rows.filter((r) => r.status === 'present').length;
    const absent = rows.filter((r) => r.status === 'absent').length;
    const late = rows.filter((r) => r.status === 'late').length;
    const onLeave = rows.filter((r) => r.status === 'on_leave').length;
    return { present, absent, late, onLeave, total: rows.length };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        studentFullName(r).toLowerCase().includes(q) ||
        (r.roll_number || '').toLowerCase().includes(q) ||
        r.admission_number.toLowerCase().includes(q),
    );
  }, [rows, studentSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreActionsRef.current && !moreActionsRef.current.contains(e.target as Node)) {
        setShowMoreActions(false);
      }
      if (!(e.target as Element).closest('[data-row-actions]')) {
        setOpenActionRowId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedClassName = classes.find((c) => c.id.toString() === classId)?.name;
  const selectedSectionName = sections.find((s) => s.id.toString() === sectionId)?.name;

  const filteredIndividualStudents = allStudents.filter((s) => {
    const q = individualSearch.toLowerCase();
    return (
      studentFullName(s).toLowerCase().includes(q) ||
      s.admission_number.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (!individualStudentId || !markDate) return;

    const params = new URLSearchParams({
      start_date: markDate,
      end_date: markDate,
      student_id: individualStudentId,
    });

    fetch(`/api/attendance/students?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          const record = data.data[0];
          setIndividualStatus((record.status as AttendanceStatus) || 'present');
          setIndividualRemarks(record.remarks || '');
        } else {
          setIndividualStatus('present');
          setIndividualRemarks('');
        }
      })
      .catch(console.error);
  }, [individualStudentId, markDate]);

  const selectedIndividual = allStudents.find((s) => s.id.toString() === individualStudentId);

  const setRowStatus = (studentId: number, status: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => (r.id === studentId ? { ...r, status } : r))
    );
  };

  const toggleRowSelected = (studentId: number) => {
    setRows((prev) =>
      prev.map((r) => (r.id === studentId ? { ...r, selected: !r.selected } : r))
    );
  };

  const markAllPresent = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: 'present' as AttendanceStatus })));
  };

  const markAllAbsent = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: 'absent' as AttendanceStatus })));
  };

  const markAllLate = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: 'late' as AttendanceStatus })));
  };

  const clearAll = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: null, selected: false })));
  };

  const applyBulkToSelected = () => {
    setRows((prev) =>
      prev.map((r) =>
        r.selected || prev.every((x) => !x.selected)
          ? { ...r, status: bulkStatus }
          : r
      )
    );
  };

  const saveDraft = () => {
    if (!classId || rows.length === 0) return;
    const draft: Record<string, AttendanceStatus> = {};
    for (const r of rows) {
      if (r.status) draft[r.id] = r.status;
    }
    localStorage.setItem(draftKey(markDate, classId, sectionId), JSON.stringify(draft));
    alert('Draft saved on this device. Submit when ready to record attendance.', {
      title: 'Draft saved',
      type: 'success',
    });
  };

  const submitClassAttendance = async () => {
    if (!classId || rows.length === 0) {
      await alert('Select a class with students before submitting.', {
        title: 'Nothing to submit',
        type: 'warning',
      });
      return;
    }

    const unmarked = rows.filter((r) => !r.status);
    if (unmarked.length > 0) {
      const proceed = await confirm(
        `${unmarked.length} student(s) have no status. They will be marked absent. Continue?`,
        { title: 'Unmarked students', type: 'warning', confirmText: 'Submit' }
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      const attendance_records = rows.map((r) => ({
        student_id: r.id,
        date: markDate,
        status: r.status || 'absent',
      }));

      const response = await fetch('/api/attendance/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_records }),
      });

      const data = await response.json();
      if (data.success) {
        localStorage.removeItem(draftKey(markDate, classId, sectionId));
        await alert(`Attendance submitted for ${data.data.length} students.`, {
          title: 'Submitted',
          type: 'success',
        });
        onSaved();
        loadClassStudents();
      } else {
        await alert(data.error || 'Failed to submit attendance', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      await alert('Failed to submit attendance.', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const submitIndividual = async () => {
    if (!individualStudentId) {
      await alert('Please select a student.', { title: 'Student required', type: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/attendance/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: parseInt(individualStudentId, 10),
          date: markDate,
          status: individualStatus,
          remarks: individualRemarks || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await alert('Attendance recorded successfully.', { title: 'Submitted', type: 'success' });
        setIndividualRemarks('');
        onSaved();
      } else {
        await alert(data.error || 'Failed to save attendance', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving individual attendance:', error);
      await alert('Failed to save attendance.', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    variant === 'individual' ? !!individualStudentId : !!classId && rows.length > 0;

  useEffect(() => {
    onSubmitStateChange?.({ canSubmit, saving });
  }, [canSubmit, saving, onSubmitStateChange]);

  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        if (variant === 'individual') void submitIndividual();
        else void submitClassAttendance();
      },
    }),
    [variant, individualStudentId, classId, rows, markDate, individualStatus, individualRemarks]
  );

  if (variant === 'individual') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 min-w-[200px]">
            <label className="block text-sm">
              <span className="text-gray-600 text-xs font-medium">Date</span>
              <input
                type="date"
                value={markDate}
                onChange={(e) => setMarkDate(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>
          <SubmitAttendanceActions
            onSubmit={submitIndividual}
            saving={saving}
            canSubmit={canSubmit}
            showSaveDraft={false}
            className="shrink-0"
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 max-w-2xl">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <input
              type="text"
              value={individualSearch}
              onChange={(e) => {
                setIndividualSearch(e.target.value);
                setShowIndividualDropdown(true);
                setIndividualStudentId('');
              }}
              onFocus={() => setShowIndividualDropdown(true)}
              placeholder="Search by name or admission number..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {showIndividualDropdown &&
              filteredIndividualStudents.length > 0 &&
              !individualStudentId && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {filteredIndividualStudents.slice(0, 25).map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        setIndividualStudentId(student.id.toString());
                        setIndividualSearch(studentFullName(student));
                        setShowIndividualDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3"
                    >
                      <StudentAvatar student={student} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {studentFullName(student)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {student.admission_number}
                          {student.class_name ? ` · ${student.class_name}` : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </div>

          {selectedIndividual && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
              <StudentAvatar student={selectedIndividual} size="lg" />
              <div>
                <p className="font-semibold text-gray-900">{studentFullName(selectedIndividual)}</p>
                <p className="text-xs text-gray-500">
                  {selectedIndividual.admission_number}
                  {selectedIndividual.class_name
                    ? ` · ${selectedIndividual.class_name}${selectedIndividual.section_name ? ` - ${selectedIndividual.section_name}` : ''}`
                    : ''}
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Attendance status</p>
            <StatusButtons value={individualStatus} onChange={setIndividualStatus} />
          </div>

          <label className="block text-sm">
            <span className="text-gray-700">Remarks (optional)</span>
            <textarea
              value={individualRemarks}
              onChange={(e) => setIndividualRemarks(e.target.value)}
              rows={2}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Optional notes..."
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2"
          >
            Cancel
          </button>
          <SubmitAttendanceActions
            onSubmit={submitIndividual}
            saving={saving}
            canSubmit={canSubmit}
            showSaveDraft={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
        <label className="block text-xs">
          <span className="text-gray-500 font-medium">Date</span>
          <input
            type="date"
            value={markDate}
            onChange={(e) => setMarkDate(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </label>
        <label className="block text-xs">
          <span className="text-gray-500 font-medium">Class</span>
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId('');
            }}
            className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          <span className="text-gray-500 font-medium">Section</span>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={!classId}
            className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white disabled:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="block text-xs">
          <span className="text-gray-500 font-medium">Attendance Mode</span>
          <div className="mt-1 flex rounded-lg border border-gray-200 overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setMarkMode('manual')}
              className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                markMode === 'manual'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiEdit3 size={13} />
              Manual
            </button>
            <button
              type="button"
              onClick={() => setMarkMode('bulk')}
              className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium border-l border-gray-200 transition-colors ${
                markMode === 'bulk'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiUpload size={13} />
              Bulk
            </button>
          </div>
        </div>
      </div>

      {classId && rows.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm text-gray-800">
              You are marking attendance for{' '}
              <span className="font-semibold text-gray-900">
                {selectedClassName}
                {selectedSectionName ? ` — ${selectedSectionName}` : ''}
              </span>
              {' · '}
              <span className="font-medium">{classCounts.total} students</span>
              {' · '}
              <span className="text-gray-600">
                {new Date(markDate).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </p>
            <SubmitAttendanceActions
              onSaveDraft={saveDraft}
              onSubmit={submitClassAttendance}
              saving={saving}
              canSubmit={canSubmit}
              className="shrink-0"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Present', count: classCounts.present, className: 'bg-green-100 text-green-800' },
              { label: 'Absent', count: classCounts.absent, className: 'bg-red-100 text-red-800' },
              { label: 'Late', count: classCounts.late, className: 'bg-amber-100 text-amber-800' },
              { label: 'On Leave', count: classCounts.onLeave, className: 'bg-blue-100 text-blue-800' },
            ].map((badge) => (
              <span
                key={badge.label}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
              >
                {badge.label}
                <span className="font-bold">{badge.count}</span>
                <span className="opacity-70">({pct(badge.count, classCounts.total)}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {markMode === 'bulk' && classId && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          <span className="text-xs text-gray-600">Apply to selected (or all if none selected):</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as AttendanceStatus)}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
          >
            {STATUS_CONFIG.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyBulkToSelected}
            className="bg-primary-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary-700"
          >
            Apply
          </button>
        </div>
      )}

      {classId && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search student by name or roll no..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <button
            type="button"
            onClick={markAllPresent}
            className="text-xs font-medium border border-green-200 text-green-700 px-3 py-2 rounded-lg hover:bg-green-50"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium border border-red-200 text-red-600 px-3 py-2 rounded-lg hover:bg-red-50"
          >
            Clear All
          </button>
          <div className="relative" ref={moreActionsRef}>
            <button
              type="button"
              onClick={() => setShowMoreActions((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-medium border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 bg-white"
            >
              More Actions
              <FiChevronDown size={14} />
            </button>
            {showMoreActions && (
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    markAllAbsent();
                    setShowMoreActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                >
                  Mark All Absent
                </button>
                <button
                  type="button"
                  onClick={() => {
                    markAllLate();
                    setShowMoreActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                >
                  Mark All Late
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMarkMode('bulk');
                    setShowMoreActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                >
                  Switch to Bulk Mode
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {!classId ? (
          <div className="text-center py-14 text-gray-500 text-sm">
            Select a class and section to load students.
          </div>
        ) : loadingList ? (
          <div className="text-center py-14 text-gray-500 text-sm">Loading students...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-14 text-gray-500 text-sm">
            No active students in this class/section.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-14 text-gray-500 text-sm">No students match your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2.5 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredRows.length > 0 && filteredRows.every((r) => r.selected)
                      }
                      onChange={() => {
                        const allSelected = filteredRows.every((r) => r.selected);
                        const visibleIds = new Set(filteredRows.map((r) => r.id));
                        setRows((prev) =>
                          prev.map((r) =>
                            visibleIds.has(r.id) ? { ...r, selected: !allSelected } : r,
                          ),
                        );
                      }}
                      aria-label="Select all visible"
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold w-16">Roll No.</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold">Student Name</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold w-[24rem]">
                    Attendance Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleRowSelected(row.id)}
                        aria-label={`Select ${studentFullName(row)}`}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">
                      {row.roll_number || index + 1}
                    </td>
                    <td className="px-3 py-2.5 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StudentAvatar student={row} />
                        <span className="font-medium text-gray-900 text-sm truncate">
                          {studentFullName(row)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 relative" data-row-actions>
                      <div className="flex items-center justify-end gap-1">
                        <StatusButtons
                          value={row.status}
                          onChange={(status) => setRowStatus(row.id, status)}
                          compact
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setOpenActionRowId((prev) => (prev === row.id ? null : row.id))
                          }
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 shrink-0"
                          aria-label="Row actions"
                        >
                          <FiMoreVertical size={16} />
                        </button>
                      </div>
                      {openActionRowId === row.id && (
                        <div className="absolute right-3 top-full z-20 mt-0.5 min-w-[9rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          {STATUS_CONFIG.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setRowStatus(row.id, opt.value);
                                setOpenActionRowId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
                            >
                              Mark {opt.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, status: null } : r,
                                ),
                              );
                              setOpenActionRowId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 border-t border-gray-100"
                          >
                            Clear status
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});

export default MarkStudentAttendancePanel;

function StudentAvatar({
  student,
  size = 'md',
}: {
  student: StudentOption;
  size?: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs';
  if (student.photo_url?.trim()) {
    return (
      <img
        src={student.photo_url}
        alt=""
        className={`${dim} rounded-full object-cover border border-gray-200 shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center shrink-0`}
    >
      {studentInitials(student)}
    </div>
  );
}
