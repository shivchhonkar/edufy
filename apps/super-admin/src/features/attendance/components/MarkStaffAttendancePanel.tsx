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
  FiX,
} from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
type MarkMode = 'manual' | 'bulk';

interface DepartmentOption {
  id: number;
  name: string;
}

interface StaffOption {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  department?: string;
  department_id?: number;
  department_name?: string;
  designation_name?: string;
  photo_url?: string | null;
}

interface StaffMarkRow extends StaffOption {
  status: AttendanceStatus | null;
  selected: boolean;
}

interface MarkStaffAttendancePanelProps {
  variant: 'bulk' | 'individual';
  onSaved: () => void;
  onCancel?: () => void;
  onSubmitStateChange?: (state: { canSubmit: boolean; saving: boolean }) => void;
}

export type MarkStaffAttendancePanelHandle = {
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
    value: 'half_day',
    label: 'Half Day',
    activeClass: 'bg-orange-500 text-white border-orange-500',
    idleClass: 'text-orange-700 border-orange-200 hover:bg-orange-50',
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

const PRIMARY_STATUSES: AttendanceStatus[] = ['present', 'absent', 'on_leave'];
const OVERFLOW_STATUSES: AttendanceStatus[] = ['late', 'half_day'];

function draftKey(date: string, departmentId: string) {
  return `staff-attendance-draft:${date}:${departmentId}`;
}

function staffName(s: StaffOption) {
  return `${s.first_name} ${s.last_name}`.trim();
}

function staffDepartment(s: StaffOption) {
  return s.department_name || s.department || '—';
}

function staffInitials(s: StaffOption) {
  return `${s.first_name?.[0] ?? ''}${s.last_name?.[0] ?? ''}`.toUpperCase() || '?';
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const visibleConfig = compact
    ? STATUS_CONFIG.filter((opt) => PRIMARY_STATUSES.includes(opt.value))
    : STATUS_CONFIG;
  const overflowConfig = STATUS_CONFIG.filter((opt) => OVERFLOW_STATUSES.includes(opt.value));
  const overflowActive = value !== null && OVERFLOW_STATUSES.includes(value);

  return (
    <div
      ref={menuRef}
      className={`flex flex-nowrap gap-1.5 items-center ${compact ? 'justify-end' : 'justify-end'}`}
    >
      {visibleConfig.map((opt) => {
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
      {compact && (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`p-1.5 rounded-md shrink-0 ${
              overflowActive
                ? 'text-primary-600 bg-primary-50 hover:bg-primary-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            aria-label="More status options"
            aria-expanded={menuOpen}
          >
            <FiMoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-0.5 min-w-[9rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {overflowConfig.map((opt) => {
                const active = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setMenuOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${
                      active
                        ? 'bg-gray-50 font-medium text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
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

function StaffAvatar({ staff, size = 'md' }: { staff: StaffOption; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs';
  if (staff.photo_url?.trim()) {
    return (
      <img
        src={staff.photo_url}
        alt=""
        className={`${dim} rounded-full object-cover border border-gray-200 shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center shrink-0`}
    >
      {staffInitials(staff)}
    </div>
  );
}

const MarkStaffAttendancePanel = forwardRef<
  MarkStaffAttendancePanelHandle,
  MarkStaffAttendancePanelProps
>(function MarkStaffAttendancePanel(
  { variant, onSaved, onCancel, onSubmitStateChange },
  ref
) {
  const { alert, confirm } = useDialog();
  const today = new Date().toISOString().split('T')[0];

  const [markDate, setMarkDate] = useState(today);
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [rows, setRows] = useState<StaffMarkRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [allStaff, setAllStaff] = useState<StaffOption[]>([]);
  const [individualStaffId, setIndividualStaffId] = useState('');
  const [individualSearch, setIndividualSearch] = useState('');
  const [individualStatus, setIndividualStatus] = useState<AttendanceStatus>('present');
  const [individualRemarks, setIndividualRemarks] = useState('');
  const [showIndividualDropdown, setShowIndividualDropdown] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [markMode, setMarkMode] = useState<MarkMode>('manual');
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('present');
  const moreActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/departments?active_only=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDepartments(data.data);
      })
      .catch(console.error);

    fetch('/api/staff?limit=500&status=active')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setAllStaff(data.data);
      })
      .catch(console.error);
  }, []);

  const applyDraft = useCallback(
    (nextRows: StaffMarkRow[]) => {
      if (typeof window === 'undefined') return nextRows;
      try {
        const raw = localStorage.getItem(draftKey(markDate, departmentId));
        if (!raw) return nextRows;
        const draft = JSON.parse(raw) as Record<string, AttendanceStatus>;
        return nextRows.map((r) => (draft[r.id] ? { ...r, status: draft[r.id] } : r));
      } catch {
        return nextRows;
      }
    },
    [markDate, departmentId]
  );

  const loadStaff = useCallback(async () => {
    setLoadingList(true);
    try {
      const attendanceParams = new URLSearchParams({
        start_date: markDate,
        end_date: markDate,
      });

      const [staffRes, attendanceRes] = await Promise.all([
        fetch('/api/staff?limit=500&status=active'),
        fetch(`/api/attendance?${attendanceParams.toString()}`),
      ]);

      const staffData = await staffRes.json();
      const attendanceData = await attendanceRes.json();

      if (!staffData.success) {
        setRows([]);
        return;
      }

      let staffList: StaffOption[] = staffData.data;
      if (departmentId) {
        const deptId = parseInt(departmentId, 10);
        staffList = staffList.filter((s) => s.department_id === deptId);
      }

      const existingByStaff = new Map<number, AttendanceStatus>();
      if (attendanceData.success) {
        for (const record of attendanceData.data) {
          existingByStaff.set(record.staff_id, record.status as AttendanceStatus);
        }
      }

      let nextRows: StaffMarkRow[] = staffList.map((s) => ({
        ...s,
        status: (existingByStaff.get(s.id) as AttendanceStatus) || null,
        selected: false,
      }));

      nextRows = applyDraft(nextRows);
      setRows(nextRows);
    } catch (error) {
      console.error('Error loading staff for marking:', error);
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [markDate, departmentId, applyDraft]);

  useEffect(() => {
    if (variant === 'bulk') loadStaff();
  }, [variant, loadStaff]);

  useEffect(() => {
    if (!individualStaffId || !markDate) return;

    const params = new URLSearchParams({
      start_date: markDate,
      end_date: markDate,
      staff_id: individualStaffId,
    });

    fetch(`/api/attendance?${params.toString()}`)
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
  }, [individualStaffId, markDate]);

  const selectedDepartmentName = departments.find((d) => d.id.toString() === departmentId)?.name;

  const statusCounts = useMemo(() => {
    const present = rows.filter((r) => r.status === 'present').length;
    const absent = rows.filter((r) => r.status === 'absent').length;
    const late = rows.filter((r) => r.status === 'late').length;
    const halfDay = rows.filter((r) => r.status === 'half_day').length;
    const onLeave = rows.filter((r) => r.status === 'on_leave').length;
    const unmarked = rows.filter((r) => !r.status).length;
    return { present, absent, late, halfDay, onLeave, unmarked, total: rows.length };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        staffName(r).toLowerCase().includes(q) ||
        r.employee_id.toLowerCase().includes(q) ||
        staffDepartment(r).toLowerCase().includes(q),
    );
  }, [rows, staffSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreActionsRef.current && !moreActionsRef.current.contains(e.target as Node)) {
        setShowMoreActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredIndividualStaff = allStaff.filter((s) => {
    const q = individualSearch.toLowerCase();
    return (
      staffName(s).toLowerCase().includes(q) ||
      s.employee_id.toLowerCase().includes(q) ||
      staffDepartment(s).toLowerCase().includes(q)
    );
  });

  const selectedIndividual = allStaff.find((s) => s.id.toString() === individualStaffId);

  const setRowStatus = (staffId: number, status: AttendanceStatus) => {
    setRows((prev) => prev.map((r) => (r.id === staffId ? { ...r, status } : r)));
  };

  const toggleRowSelected = (staffId: number) => {
    setRows((prev) =>
      prev.map((r) => (r.id === staffId ? { ...r, selected: !r.selected } : r))
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

  const markAllHalfDay = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: 'half_day' as AttendanceStatus })));
  };

  const applyBulkToSelected = () => {
    setRows((prev) =>
      prev.map((r) =>
        r.selected || prev.every((x) => !x.selected) ? { ...r, status: bulkStatus } : r,
      ),
    );
  };

  const clearAll = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: null, selected: false })));
  };

  const saveDraft = () => {
    if (rows.length === 0) return;
    const draft: Record<string, AttendanceStatus> = {};
    for (const r of rows) {
      if (r.status) draft[r.id] = r.status;
    }
    localStorage.setItem(draftKey(markDate, departmentId), JSON.stringify(draft));
    alert('Draft saved on this device. Submit when ready to record attendance.', {
      title: 'Draft saved',
      type: 'success',
    });
  };

  const submitBulk = async () => {
    if (rows.length === 0) {
      await alert('No staff loaded to submit.', { title: 'Nothing to submit', type: 'warning' });
      return;
    }

    const unmarked = rows.filter((r) => !r.status);
    if (unmarked.length > 0) {
      const proceed = await confirm(
        `${unmarked.length} staff member(s) have no status. They will be marked absent. Continue?`,
        { title: 'Unmarked staff', type: 'warning', confirmText: 'Submit' }
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      const attendance_records = rows.map((r) => ({
        staff_id: r.id,
        attendance_date: markDate,
        status: r.status || 'absent',
        attendance_type: 'manual',
      }));

      const response = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_records }),
      });

      const data = await response.json();
      if (data.success) {
        localStorage.removeItem(draftKey(markDate, departmentId));
        await alert(`Attendance submitted for ${data.data.length} staff member(s).`, {
          title: 'Submitted',
          type: 'success',
        });
        onSaved();
        await loadStaff();
      } else {
        await alert(data.error || 'Failed to submit attendance', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error submitting staff attendance:', error);
      await alert('Failed to submit attendance.', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const submitIndividual = async () => {
    if (!individualStaffId) {
      await alert('Please select a staff member.', { title: 'Staff required', type: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: parseInt(individualStaffId, 10),
          attendance_date: markDate,
          status: individualStatus,
          attendance_type: 'manual',
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
      console.error('Error saving individual staff attendance:', error);
      await alert('Failed to save attendance.', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    variant === 'individual' ? !!individualStaffId : rows.length > 0;

  useEffect(() => {
    onSubmitStateChange?.({ canSubmit, saving });
  }, [canSubmit, saving, onSubmitStateChange]);

  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        if (variant === 'individual') void submitIndividual();
        else void submitBulk();
      },
    }),
    [variant, individualStaffId, rows, markDate, individualStatus, individualRemarks]
  );

  if (variant === 'individual') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 min-w-[200px]">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff member</label>
            <input
              type="text"
              value={individualSearch}
              onChange={(e) => {
                setIndividualSearch(e.target.value);
                setShowIndividualDropdown(true);
                setIndividualStaffId('');
              }}
              onFocus={() => setShowIndividualDropdown(true)}
              placeholder="Search by name, employee ID, or department..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {showIndividualDropdown &&
              filteredIndividualStaff.length > 0 &&
              !individualStaffId && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {filteredIndividualStaff.slice(0, 25).map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setIndividualStaffId(member.id.toString());
                        setIndividualSearch(staffName(member));
                        setShowIndividualDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3"
                    >
                      <StaffAvatar staff={member} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{staffName(member)}</div>
                        <div className="text-xs text-gray-500">
                          {member.employee_id} · {staffDepartment(member)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </div>

          {selectedIndividual && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
              <StaffAvatar staff={selectedIndividual} size="lg" />
              <div>
                <p className="font-semibold text-gray-900">{staffName(selectedIndividual)}</p>
                <p className="text-xs text-gray-500">
                  {selectedIndividual.employee_id} · {staffDepartment(selectedIndividual)}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end">
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
          <span className="text-gray-500 font-medium">Department</span>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
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

      {rows.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm text-gray-800">
              You are marking attendance for{' '}
              <span className="font-semibold text-gray-900">
                {selectedDepartmentName || 'All departments'}
              </span>
              {' · '}
              <span className="font-medium">
                {statusCounts.total} staff member{statusCounts.total === 1 ? '' : 's'}
              </span>
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
              onSubmit={submitBulk}
              saving={saving}
              canSubmit={canSubmit}
              className="shrink-0"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              {
                label: 'Present',
                count: statusCounts.present,
                className: 'bg-green-100 text-green-800',
              },
              {
                label: 'Absent',
                count: statusCounts.absent,
                className: 'bg-red-100 text-red-800',
              },
              {
                label: 'Late',
                count: statusCounts.late,
                className: 'bg-amber-100 text-amber-800',
              },
              {
                label: 'Half Day',
                count: statusCounts.halfDay,
                className: 'bg-orange-100 text-orange-800',
              },
              {
                label: 'On Leave',
                count: statusCounts.onLeave,
                className: 'bg-blue-100 text-blue-800',
              },
            ].map((badge) => (
              <span
                key={badge.label}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
              >
                {badge.label}
                <span className="font-bold">{badge.count}</span>
                <span className="opacity-70">({pct(badge.count, statusCounts.total)}%)</span>
              </span>
            ))}
            {statusCounts.unmarked > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700">
                Unmarked
                <span className="font-bold">{statusCounts.unmarked}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {markMode === 'bulk' && rows.length > 0 && (
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

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <FiSearch
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <input
              type="text"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              placeholder="Search staff by name or employee ID..."
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
                    markAllHalfDay();
                    setShowMoreActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                >
                  Mark All Half Day
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
        {loadingList ? (
          <div className="text-center py-14 text-gray-500 text-sm">Loading staff...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-14 text-gray-500 text-sm">
            No active staff found{selectedDepartmentName ? ` in ${selectedDepartmentName}` : ''}.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-14 text-gray-500 text-sm">
            No staff match your search.
          </div>
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
                  <th className="px-3 py-2.5 text-left text-xs font-semibold">Employee</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold w-28">Employee ID</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold w-32">Department</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold w-[24rem]">
                    Attendance Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleRowSelected(row.id)}
                        aria-label={`Select ${staffName(row)}`}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-2.5 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StaffAvatar staff={row} />
                        <span className="font-medium text-gray-900 text-sm truncate">
                          {staffName(row)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">{row.employee_id}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs truncate">
                      {staffDepartment(row)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <StatusButtons
                        value={row.status}
                        onChange={(status) => setRowStatus(row.id, status)}
                        compact
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {onCancel && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
});

export default MarkStaffAttendancePanel;
