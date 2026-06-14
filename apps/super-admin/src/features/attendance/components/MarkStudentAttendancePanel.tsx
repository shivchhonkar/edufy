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
import { studentFullName } from '@/features/students/utils/student-profile';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';

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
  admission_number: string;
  roll_number?: string | null;
  class_name?: string;
  section_name?: string;
}

interface StudentMarkRow extends StudentOption {
  status: AttendanceStatus;
  present: boolean;
}

interface MarkStudentAttendancePanelProps {
  classes: ClassOption[];
  onSaved: () => void;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'on_leave', label: 'On Leave' },
];

const MODE_OPTIONS: { value: 'class' | 'individual'; label: string; description: string }[] = [
  {
    value: 'class',
    label: 'By Class / Section',
    description: 'Load students by class and mark attendance in bulk',
  },
  {
    value: 'individual',
    label: 'Individual Student',
    description: 'Mark attendance for a single student',
  },
];

function isPresentStatus(status: AttendanceStatus) {
  return status === 'present' || status === 'late' || status === 'half_day';
}

function statusFromPresent(present: boolean): AttendanceStatus {
  return present ? 'present' : 'absent';
}

export default function MarkStudentAttendancePanel({
  classes,
  onSaved,
}: MarkStudentAttendancePanelProps) {
  const { alert } = useDialog();
  const today = new Date().toISOString().split('T')[0];

  const [mode, setMode] = useState<'class' | 'individual'>('class');
  const [markDate, setMarkDate] = useState(today);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [listSearch, setListSearch] = useState('');
  const [rows, setRows] = useState<StudentMarkRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

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
        if (data.success) {
          setAllStudents(
            data.data.map((s: StudentOption) => ({
              id: s.id,
              first_name: s.first_name,
              last_name: s.last_name,
              admission_number: s.admission_number,
              roll_number: s.roll_number,
              class_name: s.class_name,
              section_name: s.section_name,
            }))
          );
        }
      })
      .catch(console.error);
  }, []);

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

      const nextRows: StudentMarkRow[] = studentsData.data.map((s: StudentOption) => {
        const existing = existingByStudent.get(s.id);
        const status: AttendanceStatus = existing || 'present';
        return {
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          admission_number: s.admission_number,
          roll_number: s.roll_number,
          class_name: s.class_name,
          section_name: s.section_name,
          status,
          present: existing ? isPresentStatus(existing) : true,
        };
      });

      setRows(nextRows);
      setListSearch('');
    } catch (error) {
      console.error('Error loading students for marking:', error);
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [classId, sectionId, markDate]);

  useEffect(() => {
    if (mode === 'class') {
      loadClassStudents();
    }
  }, [mode, loadClassStudents]);

  const filteredRows = useMemo(() => {
    if (!listSearch.trim()) return rows;
    const q = listSearch.toLowerCase();
    return rows.filter(
      (r) =>
        studentFullName(r).toLowerCase().includes(q) ||
        r.admission_number.toLowerCase().includes(q) ||
        (r.roll_number || '').toLowerCase().includes(q)
    );
  }, [rows, listSearch]);

  const presentCount = rows.filter((r) => r.present).length;

  const filteredIndividualStudents = allStudents.filter((s) => {
    const q = individualSearch.toLowerCase();
    return (
      studentFullName(s).toLowerCase().includes(q) ||
      s.admission_number.toLowerCase().includes(q)
    );
  });

  const selectedIndividual = allStudents.find(
    (s) => s.id.toString() === individualStudentId
  );

  const toggleRow = (studentId: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== studentId) return r;
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

  const setRowStatus = (studentId: number, status: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === studentId ? { ...r, status, present: isPresentStatus(status) } : r
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

  const allFilteredPresent =
    filteredRows.length > 0 && filteredRows.every((r) => r.present);

  const saveClassAttendance = async () => {
    if (!classId || rows.length === 0) {
      await alert('Select a class with students before saving.', {
        title: 'Nothing to save',
        type: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      const attendance_records = rows.map((r) => ({
        student_id: r.id,
        date: markDate,
        status: r.present ? r.status : 'absent',
      }));

      const response = await fetch('/api/attendance/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_records }),
      });

      const data = await response.json();
      if (data.success) {
        await alert(`Attendance saved for ${data.data.length} students.`, {
          title: 'Saved',
          type: 'success',
        });
        onSaved();
      } else {
        await alert(data.error || 'Failed to save attendance', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving class attendance:', error);
      await alert('Failed to save attendance. Please try again.', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const saveIndividualAttendance = async () => {
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
        await alert('Attendance recorded successfully.', { title: 'Saved', type: 'success' });
        setIndividualRemarks('');
        onSaved();
      } else {
        await alert(data.error || 'Failed to save attendance', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving individual attendance:', error);
      await alert('Failed to save attendance. Please try again.', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const selectedClassName = classes.find((c) => c.id.toString() === classId)?.name;

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId('');
                }}
                disabled={mode === 'individual'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section (optional)
              </label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!classId || mode === 'individual'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              >
                <option value="">All sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Mode
          </h2>
          <div className="space-y-3">
            {MODE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  mode === opt.value
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="attendance_mode"
                  value={opt.value}
                  checked={mode === opt.value}
                  onChange={() => setMode(opt.value)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
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
            {mode === 'class' && selectedClassName && (
              <div className="flex justify-between text-gray-600">
                <span>Class</span>
                <span className="font-medium text-gray-900">{selectedClassName}</span>
              </div>
            )}
            {mode === 'class' && (
              <>
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
              </>
            )}
            {mode === 'individual' && (
              <p className="text-gray-500 text-xs leading-relaxed">
                Search and select a student below to record attendance for the chosen date.
              </p>
            )}
          </div>
        </div>
      </div>

      {mode === 'class' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FiUsers className="text-primary-600" />
              <h2 className="font-semibold text-gray-900">
                Students
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
                  placeholder="Search students..."
                  className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg w-48"
                />
              </div>
              <button
                type="button"
                onClick={loadClassStudents}
                disabled={!classId || loadingList}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <FiRefreshCw className={loadingList ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                type="button"
                onClick={saveClassAttendance}
                disabled={!classId || rows.length === 0 || saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave className="w-4 h-4" />
                {saving ? 'Saving...' : `Save ${rows.length} Student(s)`}
              </button>
            </div>
          </div>

          {!classId ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              Select a class to load students.
            </div>
          ) : loadingList ? (
            <div className="text-center py-16 text-gray-500 text-sm">Loading students...</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              No active students found in the selected class/section.
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              No students match your search.
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
                    <th className="px-5 py-3 text-left">Student</th>
                    <th className="px-5 py-3 text-left">Admission No.</th>
                    <th className="px-5 py-3 text-left">Roll No.</th>
                    <th className="px-5 py-3 text-left">Current Class</th>
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
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {studentFullName(row)}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{row.admission_number}</td>
                      <td className="px-5 py-3 text-gray-600">{row.roll_number || '—'}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {row.class_name || '—'}
                        {row.section_name ? ` · ${row.section_name}` : ''}
                      </td>
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
      )}

      {mode === 'individual' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Individual Student</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Record attendance for one student on {new Date(markDate).toLocaleDateString('en-IN')}
            </p>
          </div>
          <div className="p-5 max-w-xl space-y-4">
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
              {showIndividualDropdown && filteredIndividualStudents.length > 0 && !individualStudentId && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredIndividualStudents.slice(0, 20).map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        setIndividualStudentId(student.id.toString());
                        setIndividualSearch(studentFullName(student));
                        setShowIndividualDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50"
                    >
                      <div className="text-sm font-medium text-gray-900">{studentFullName(student)}</div>
                      <div className="text-xs text-gray-500">
                        {student.admission_number}
                        {student.class_name ? ` · ${student.class_name}` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedIndividual && (
                <p className="mt-1 text-xs text-gray-500">
                  {selectedIndividual.admission_number}
                  {selectedIndividual.class_name ? ` · ${selectedIndividual.class_name}` : ''}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={individualStatus}
                onChange={(e) => setIndividualStatus(e.target.value as AttendanceStatus)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                value={individualRemarks}
                onChange={(e) => setIndividualRemarks(e.target.value)}
                rows={3}
                placeholder="Optional notes..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={saveIndividualAttendance}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
