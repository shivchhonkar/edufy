'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FiCheckSquare,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiSquare,
  FiUsers,
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
}

interface StaffMarkRow extends StaffOption {
  status: AttendanceStatus;
  present: boolean;
}

interface MarkStaffAttendancePanelProps {
  onSaved: () => void;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'on_leave', label: 'On Leave' },
];

function isPresentStatus(status: AttendanceStatus) {
  return status === 'present' || status === 'late' || status === 'half_day';
}

function statusFromPresent(present: boolean): AttendanceStatus {
  return present ? 'present' : 'absent';
}

function staffName(s: StaffOption) {
  return `${s.first_name} ${s.last_name}`.trim();
}

function staffDepartment(s: StaffOption) {
  return s.department_name || s.department || '—';
}

export default function MarkStaffAttendancePanel({ onSaved }: MarkStaffAttendancePanelProps) {
  const { alert } = useDialog();
  const today = new Date().toISOString().split('T')[0];

  const [markDate, setMarkDate] = useState(today);
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [listSearch, setListSearch] = useState('');
  const [rows, setRows] = useState<StaffMarkRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/departments?active_only=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDepartments(data.data);
      })
      .catch(console.error);
  }, []);

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

      const nextRows: StaffMarkRow[] = staffList.map((s) => {
        const existing = existingByStaff.get(s.id);
        const status: AttendanceStatus = existing || 'present';
        return {
          ...s,
          status,
          present: existing ? isPresentStatus(existing) : true,
        };
      });

      setRows(nextRows);
      setListSearch('');
    } catch (error) {
      console.error('Error loading staff for marking:', error);
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [markDate, departmentId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const filteredRows = useMemo(() => {
    if (!listSearch.trim()) return rows;
    const q = listSearch.toLowerCase();
    return rows.filter(
      (r) =>
        staffName(r).toLowerCase().includes(q) ||
        r.employee_id.toLowerCase().includes(q) ||
        staffDepartment(r).toLowerCase().includes(q)
    );
  }, [rows, listSearch]);

  const presentCount = rows.filter((r) => r.present).length;

  const toggleRow = (staffId: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== staffId) return r;
        const present = !r.present;
        return {
          ...r,
          present,
          status: present
            ? r.status === 'absent' || r.status === 'on_leave'
              ? 'present'
              : r.status
            : 'absent',
        };
      })
    );
  };

  const setRowStatus = (staffId: number, status: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === staffId ? { ...r, status, present: isPresentStatus(status) } : r
      )
    );
  };

  const toggleAllFiltered = () => {
    const allPresent = filteredRows.every((r) => r.present);
    const ids = new Set(filteredRows.map((r) => r.id));
    setRows((prev) =>
      prev.map((r) =>
        ids.has(r.id)
          ? { ...r, present: !allPresent, status: statusFromPresent(!allPresent) }
          : r
      )
    );
  };

  const markAll = (present: boolean) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        present,
        status: statusFromPresent(present),
      }))
    );
  };

  const allFilteredPresent =
    filteredRows.length > 0 && filteredRows.every((r) => r.present);

  const saveAttendance = async () => {
    if (rows.length === 0) {
      await alert('No staff loaded to save.', { title: 'Nothing to save', type: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const attendance_records = rows.map((r) => ({
        staff_id: r.id,
        attendance_date: markDate,
        status: r.present ? r.status : 'absent',
        attendance_type: 'manual',
      }));

      const response = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_records }),
      });

      const data = await response.json();
      if (data.success) {
        await alert(`Attendance saved for ${data.data.length} staff member(s).`, {
          title: 'Saved',
          type: 'success',
        });
        onSaved();
        await loadStaff();
      } else {
        await alert(data.error || 'Failed to save attendance', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving staff attendance:', error);
      await alert('Failed to save attendance. Please try again.', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const selectedDepartmentName = departments.find((d) => d.id.toString() === departmentId)?.name;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Selection
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={markDate}
                onChange={(e) => setMarkDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Quick actions
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => markAll(true)}
              disabled={rows.length === 0}
              className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
            >
              Mark all present
            </button>
            <button
              type="button"
              onClick={() => markAll(false)}
              disabled={rows.length === 0}
              className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              Mark all absent
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            Use checkboxes in the table to toggle individual staff, or change status from the dropdown.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Summary
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Date</span>
              <span className="font-medium text-gray-900">
                {new Date(markDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            {selectedDepartmentName && (
              <div className="flex justify-between text-gray-600">
                <span>Department</span>
                <span className="font-medium text-gray-900">{selectedDepartmentName}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Total loaded</span>
              <span className="font-medium text-gray-900">{rows.length}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Present</span>
              <span className="font-medium text-green-700">{presentCount}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Absent</span>
              <span className="font-medium text-red-700">{rows.length - presentCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiUsers className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">
              Staff
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({presentCount} of {rows.length} present)
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search staff..."
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg w-48"
              />
            </div>
            <button
              type="button"
              onClick={loadStaff}
              disabled={loadingList}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <FiRefreshCw className={loadingList ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={saveAttendance}
              disabled={rows.length === 0 || saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-4 h-4" />
              {saving ? 'Saving...' : `Save ${rows.length} Staff`}
            </button>
          </div>
        </div>

        {loadingList ? (
          <div className="text-center py-16 text-gray-500 text-sm">Loading staff...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No active staff found{selectedDepartmentName ? ` in ${selectedDepartmentName}` : ''}.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No staff match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-5 py-3 text-left w-10">
                    <button type="button" onClick={toggleAllFiltered} className="text-gray-600">
                      {allFilteredPresent ? (
                        <FiCheckSquare size={18} className="text-primary-600" />
                      ) : (
                        <FiSquare size={18} />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-3 text-left">Employee</th>
                  <th className="px-5 py-3 text-left">Employee ID</th>
                  <th className="px-5 py-3 text-left">Department</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-gray-50 ${row.present ? '' : 'bg-red-50/30'}`}
                  >
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => toggleRow(row.id)}
                        className="text-gray-600"
                      >
                        {row.present ? (
                          <FiCheckSquare size={18} className="text-primary-600" />
                        ) : (
                          <FiSquare size={18} />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{staffName(row)}</td>
                    <td className="px-5 py-3 text-gray-600">{row.employee_id}</td>
                    <td className="px-5 py-3 text-gray-600">{staffDepartment(row)}</td>
                    <td className="px-5 py-3">
                      <select
                        value={row.status}
                        onChange={(e) => setRowStatus(row.id, e.target.value as AttendanceStatus)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
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
}
