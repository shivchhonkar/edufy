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
import { createPortal } from 'react-dom';
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiSearch,
  FiUser,
  FiX,
} from 'react-icons/fi';
import VirtualizedTable, {
  type VirtualizedTableColumn,
} from '@/shared/components/common/VirtualizedTable';
import { getClientUserRole } from '@/lib/client-auth';
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
  filterSlotEl?: HTMLDivElement | null;
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

const ATT_LABEL = 'block text-xs font-medium text-gray-600';
const ATT_INPUT =
  'mt-1 w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary-500';
const ATT_INPUT_HEADER =
  'mt-1 w-full min-w-[8.5rem] px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary-500';
const ATT_BTN =
  'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap';
const ATT_TABLE_HEAD = 'px-3 py-2 text-xs font-medium text-gray-500';
const ATT_TABLE_CELL = 'px-3 py-2 text-sm';
const MORE_ACTIONS_MENU_ID = 'student-attendance-more-actions-menu';

function resolveDefaultClassId(classes: ClassOption[]): string {
  const classOne = classes.find((c) => c.name.trim().toLowerCase() === 'class 1');
  const defaultClass = classOne ?? sortClassesByName(classes)[0];
  return defaultClass ? defaultClass.id.toString() : '';
}

function isSuperAdminRole(role: string | null): boolean {
  return String(role || '').toLowerCase().replace(/\s+/g, '_') === 'super_admin';
}

function classScopeKey(classId: string, isSuperAdmin: boolean): string {
  if (classId) return classId;
  return isSuperAdmin ? 'all' : '';
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
              compact ? 'px-2.5 py-1 text-sm' : 'px-3 py-1.5 text-sm'
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

const MarkStudentAttendancePanel = forwardRef<
  MarkStudentAttendancePanelHandle,
  MarkStudentAttendancePanelProps
>(function MarkStudentAttendancePanel(
  { classes, variant, onSaved, onCancel, onSubmitStateChange, filterSlotEl },
  ref
) {
  const { alert, confirm } = useDialog();
  const today = getCalendarDateString();
  const isSuperAdmin = useMemo(() => isSuperAdminRole(getClientUserRole()), []);

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
  const [moreMenuCoords, setMoreMenuCoords] = useState({ top: 0, left: 0 });
  const moreActionsButtonRef = useRef<HTMLButtonElement>(null);

  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [individualStudentId, setIndividualStudentId] = useState('');
  const [individualSearch, setIndividualSearch] = useState('');
  const [individualStatus, setIndividualStatus] = useState<AttendanceStatus>('present');
  const [individualRemarks, setIndividualRemarks] = useState('');
  const [showIndividualDropdown, setShowIndividualDropdown] = useState(false);

  const isAllClassesView = isSuperAdmin && !classId;
  const canLoadStudents = !!classId || isSuperAdmin;

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
    if (isSuperAdmin) return;
    const defaultId = resolveDefaultClassId(classes);
    if (defaultId) setClassId(defaultId);
  }, [classes, variant, classId, isSuperAdmin]);

  useEffect(() => {
    if (!classId) {
      if (!isSuperAdmin) {
        setSections([]);
        setSectionId('');
        return;
      }
      fetch('/api/sections')
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setSections(data.data);
        })
        .catch(console.error);
      return;
    }
    fetch(`/api/sections?class_id=${classId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSections(data.data);
      })
      .catch(console.error);
  }, [classId, isSuperAdmin]);

  const applyDraft = useCallback(
    (nextRows: StudentMarkRow[]) => {
      const scopeKey = classScopeKey(classId, isSuperAdmin);
      if (!scopeKey || typeof window === 'undefined') return nextRows;
      try {
        const raw = localStorage.getItem(draftKey(markDate, scopeKey, sectionId));
        if (!raw) return nextRows;
        const draft = JSON.parse(raw) as Record<string, AttendanceStatus>;
        return nextRows.map((r) =>
          draft[r.id] ? { ...r, status: draft[r.id] } : r
        );
      } catch {
        return nextRows;
      }
    },
    [classId, sectionId, markDate, isSuperAdmin]
  );

  const loadClassStudents = useCallback(async () => {
    if (!canLoadStudents) {
      setRows([]);
      return;
    }

    setLoadingList(true);
    try {
      const studentParams = new URLSearchParams({
        limit: '50000',
        status: 'active',
      });
      if (classId) studentParams.set('class_id', classId);
      if (sectionId) studentParams.append('section_id', sectionId);

      const attendanceParams = new URLSearchParams({
        start_date: markDate,
        end_date: markDate,
      });
      if (classId) attendanceParams.set('class_id', classId);
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
  }, [classId, sectionId, markDate, applyDraft, canLoadStudents]);

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
    if (!showMoreActions) return;

    const updatePosition = () => {
      const rect = moreActionsButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMoreMenuCoords({
        top: rect.bottom + 4,
        left: rect.right,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showMoreActions]);

  useEffect(() => {
    if (!showMoreActions) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (moreActionsButtonRef.current?.contains(target)) return;
      const menu = document.getElementById(MORE_ACTIONS_MENU_ID);
      if (menu?.contains(target)) return;
      setShowMoreActions(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMoreActions(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMoreActions]);

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

  const markAllOnLeave = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: 'on_leave' as AttendanceStatus })));
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
    const scopeKey = classScopeKey(classId, isSuperAdmin);
    if (!scopeKey || rows.length === 0) return;
    const draft: Record<string, AttendanceStatus> = {};
    for (const r of rows) {
      if (r.status) draft[r.id] = r.status;
    }
    localStorage.setItem(draftKey(markDate, scopeKey, sectionId), JSON.stringify(draft));
    alert('Draft saved on this device. Submit when ready to record attendance.', {
      title: 'Draft saved',
      type: 'success',
    });
  };

  const submitClassAttendance = async () => {
    if (!canLoadStudents || rows.length === 0) {
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
        localStorage.removeItem(
          draftKey(markDate, classScopeKey(classId, isSuperAdmin), sectionId),
        );
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
    variant === 'individual' ? !!individualStudentId : canLoadStudents && rows.length > 0;

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

  const toggleAllVisible = useCallback(() => {
    const allSelected = filteredRows.every((r) => r.selected);
    const visibleIds = new Set(filteredRows.map((r) => r.id));
    setRows((prev) =>
      prev.map((r) => (visibleIds.has(r.id) ? { ...r, selected: !allSelected } : r)),
    );
  }, [filteredRows]);

  const studentListColumns = useMemo<VirtualizedTableColumn<StudentMarkRow>[]>(() => {
    const columns: VirtualizedTableColumn<StudentMarkRow>[] = [
      {
        key: 'select',
        width: '32px',
        header: (
          <input
            type="checkbox"
            checked={filteredRows.length > 0 && filteredRows.every((r) => r.selected)}
            onChange={toggleAllVisible}
            aria-label="Select all visible"
            className="rounded border-gray-300"
          />
        ),
        headerClassName: `${ATT_TABLE_HEAD} flex items-center`,
        cellClassName: `${ATT_TABLE_CELL} flex items-center`,
        render: (row) => (
          <input
            type="checkbox"
            checked={row.selected}
            onChange={() => toggleRowSelected(row.id)}
            aria-label={`Select ${studentFullName(row)}`}
            className="rounded border-gray-300"
          />
        ),
      },
      {
        key: 'roll',
        width: '4.75rem',
        header: 'Roll No.',
        headerClassName: `${ATT_TABLE_HEAD} text-left whitespace-nowrap`,
        cellClassName: `${ATT_TABLE_CELL} text-gray-600 tabular-nums whitespace-nowrap`,
        render: (row) =>
          row.roll_number ||
          String(filteredRows.findIndex((r) => r.id === row.id) + 1),
      },
    ];

    if (isAllClassesView) {
      columns.push({
        key: 'class',
        width: '6rem',
        header: 'Class',
        headerClassName: `${ATT_TABLE_HEAD} text-left whitespace-nowrap`,
        cellClassName: `${ATT_TABLE_CELL} text-gray-600 whitespace-nowrap`,
        render: (row) => row.class_name || '—',
      });
    }

    columns.push(
      {
        key: 'name',
        width: '1fr',
        header: 'Student Name',
        headerClassName: `${ATT_TABLE_HEAD} text-left min-w-0`,
        cellClassName: `${ATT_TABLE_CELL} min-w-0`,
        render: (row) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <StudentAvatar student={row} size="sm" />
            <span className="text-gray-900 truncate">
              {studentFullName(row)}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        width: 'minmax(240px, auto)',
        header: 'Attendance Status',
        headerClassName: `${ATT_TABLE_HEAD} text-right`,
        cellClassName: `${ATT_TABLE_CELL} flex items-center justify-end`,
        render: (row) => (
          <StatusButtons
            value={row.status}
            onChange={(status) => setRowStatus(row.id, status)}
            compact
          />
        ),
      },
    );

    return columns;
  }, [filteredRows, toggleAllVisible, isAllClassesView]);

  const classFilterControls = (
    <div className="flex flex-wrap items-end gap-3 flex-1 min-w-0 w-full">
      <label className={`${ATT_LABEL} min-w-[8.5rem]`}>
        Date
        <input
          type="date"
          value={markDate}
          onChange={(e) => setMarkDate(e.target.value)}
          className={ATT_INPUT_HEADER}
        />
      </label>
      <label className={`${ATT_LABEL} min-w-[9rem]`}>
        Class
        <select
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setSectionId('');
          }}
          className={ATT_INPUT_HEADER}
        >
          {isSuperAdmin ? (
            <option value="">All Classes</option>
          ) : (
            <option value="">Select class</option>
          )}
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className={`${ATT_LABEL} min-w-[9rem]`}>
        Section
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          disabled={!canLoadStudents}
          className={`${ATT_INPUT_HEADER} disabled:bg-gray-50`}
        >
          <option value="">All sections</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  if (variant === 'individual') {
    return (
      <div className="space-y-4">
        <label className={`${ATT_LABEL} max-w-xs`}>
          Date
          <input
            type="date"
            value={markDate}
            onChange={(e) => setMarkDate(e.target.value)}
            className={ATT_INPUT}
          />
        </label>

        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 max-w-2xl">
          <div className="relative">
            <label className={`${ATT_LABEL} mb-1`}>Student</label>
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
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

          <label className={`${ATT_LABEL}`}>
            Remarks (optional)
            <textarea
              value={individualRemarks}
              onChange={(e) => setIndividualRemarks(e.target.value)}
              rows={2}
              className={ATT_INPUT}
              placeholder="Optional notes..."
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 max-w-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filterSlotEl && createPortal(classFilterControls, filterSlotEl)}

      {markMode === 'bulk' && canLoadStudents && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="text-sm text-gray-600">Apply to selected (or all if none selected):</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as AttendanceStatus)}
            className="border border-gray-200 rounded-md px-2.5 py-1.5 text-sm bg-white"
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
            className="bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary-700"
          >
            Apply
          </button>
        </div>
      )}

      {canLoadStudents && rows.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0 overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0 text-sm">
              <span className="font-medium text-gray-700 whitespace-nowrap">
                {classCounts.total} students
              </span>
              {[
                { label: 'P', count: classCounts.present, className: 'bg-green-100 text-green-800' },
                { label: 'A', count: classCounts.absent, className: 'bg-red-100 text-red-800' },
                { label: 'L', count: classCounts.late, className: 'bg-amber-100 text-amber-800' },
                { label: 'OL', count: classCounts.onLeave, className: 'bg-blue-100 text-blue-800' },
              ].map((badge) => (
                <span
                  key={badge.label}
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${badge.className}`}
                >
                  {badge.label}
                  <span className="font-bold">{badge.count}</span>
                </span>
              ))}
            </div>

            <div className="relative flex-1 min-w-[160px] max-w-sm">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name or roll no..."
                className="w-full pl-8 pr-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={markAllPresent}
                className={`${ATT_BTN} border border-green-200 text-green-700 hover:bg-green-50 bg-white`}
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={clearAll}
                className={`${ATT_BTN} border border-red-200 text-red-600 hover:bg-red-50 bg-white`}
              >
                Clear All
              </button>
              <div className="relative shrink-0">
                <button
                  ref={moreActionsButtonRef}
                  type="button"
                  onClick={() => setShowMoreActions((prev) => !prev)}
                  className={`${ATT_BTN} border border-gray-200 text-gray-700 hover:bg-gray-50 bg-white`}
                  aria-haspopup="menu"
                  aria-expanded={showMoreActions}
                >
                  More
                  <FiChevronDown size={14} />
                </button>
                {showMoreActions &&
                  typeof document !== 'undefined' &&
                  createPortal(
                    <div
                      id={MORE_ACTIONS_MENU_ID}
                      role="menu"
                      className="fixed z-[100] w-max max-w-[14rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                      style={{
                        top: moreMenuCoords.top,
                        left: moreMenuCoords.left,
                        transform: 'translateX(-100%)',
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          markAllAbsent();
                          setShowMoreActions(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                      >
                        Mark All Absent
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          markAllLate();
                          setShowMoreActions(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                      >
                        Mark All Late
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          markAllOnLeave();
                          setShowMoreActions(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                      >
                        Mark All On Leave
                      </button>
                      {/* <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMarkMode('bulk');
                          setShowMoreActions(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                      >
                        Switch to Bulk Mode
                      </button> */}
                    </div>,
                    document.body,
                  )}
              </div>
              <button
                type="button"
                onClick={saveDraft}
                disabled={!canSubmit}
                className={`${ATT_BTN} border border-gray-200 text-primary-700 bg-white hover:bg-gray-50 disabled:opacity-40`}
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {!canLoadStudents ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            Select a class and section to load students.
          </div>
        ) : loadingList ? (
          <div className="text-center py-10 text-gray-500 text-sm">Loading students...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            No active students in this class/section.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">No students match your search.</div>
        ) : (
          <VirtualizedTable
            rows={filteredRows}
            columns={studentListColumns}
            getRowKey={(row) => row.id}
            rowHeight={52}
            maxHeight="min(65vh, 680px)"
            minWidth={isAllClassesView ? 760 : 680}
            rowClassName="hover:bg-gray-50/80"
          />
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
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim =
    size === 'lg' ? 'h-12 w-12 text-sm' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-xs';
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
