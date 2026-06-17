'use client';

import React, {
  forwardRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useImperativeHandle,
} from 'react';
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiSend,
  FiX,
} from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';

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
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'justify-end'}`}>
      {STATUS_CONFIG.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1 border rounded-md font-medium transition-colors ${
              compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
            } ${active ? opt.activeClass : opt.idleClass}`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
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
          className="border border-gray-300 text-primary-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40"
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

  const toggleAllSelected = () => {
    const allSelected = rows.length > 0 && rows.every((r) => r.selected);
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const markAllPresent = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: 'present' as AttendanceStatus })));
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <label className="block text-sm">
          <span className="text-gray-600 text-xs font-medium">Date</span>
          <input
            type="date"
            value={markDate}
            onChange={(e) => setMarkDate(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600 text-xs font-medium">Department</span>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <SubmitAttendanceActions
        onSaveDraft={saveDraft}
        onSubmit={submitBulk}
        saving={saving}
        canSubmit={canSubmit}
        className="bg-primary-50 border border-primary-100 rounded-lg px-4 py-3"
      />

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-gray-900">
              {selectedDepartmentName || 'All departments'}
            </span>
            <span className="text-green-700">✓ {statusCounts.present}</span>
            <span className="text-red-600">✗ {statusCounts.absent}</span>
            <span className="text-amber-600">⏱ {statusCounts.late}</span>
            <span className="text-orange-600">½ {statusCounts.halfDay}</span>
            <span className="text-blue-600">📅 {statusCounts.onLeave}</span>
            {statusCounts.unmarked > 0 && (
              <span className="text-gray-500">? {statusCounts.unmarked} unmarked</span>
            )}
            <span className="text-gray-500">Total: {statusCounts.total}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={markAllPresent}
              className="text-sm border border-primary-300 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loadingList ? (
          <div className="text-center py-16 text-gray-500 text-sm">Loading staff...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No active staff found{selectedDepartmentName ? ` in ${selectedDepartmentName}` : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((r) => r.selected)}
                      onChange={toggleAllSelected}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Employee</th>
                  <th className="px-4 py-3 text-left font-medium w-32">Employee ID</th>
                  <th className="px-4 py-3 text-left font-medium w-36">Department</th>
                  <th className="px-4 py-3 text-left font-medium min-w-[360px]">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleRowSelected(row.id)}
                        aria-label={`Select ${staffName(row)}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <StaffAvatar staff={row} />
                        <span className="font-medium text-gray-900">{staffName(row)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.employee_id}</td>
                    <td className="px-4 py-3 text-gray-600">{staffDepartment(row)}</td>
                    <td className="px-4 py-3">
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

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2"
        >
          Cancel
        </button>
        <SubmitAttendanceActions
          onSaveDraft={saveDraft}
          onSubmit={submitBulk}
          saving={saving}
          canSubmit={canSubmit}
        />
      </div>
    </div>
  );
});

export default MarkStaffAttendancePanel;
