'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCalendar, FiPlus, FiTrash2, FiX, FiXCircle } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AppModal, {
  APP_MODAL_BODY,
  APP_MODAL_FOOTER,
  APP_MODAL_HEADER,
  APP_MODAL_PANEL_STRUCTURED,
} from '@/shared/components/common/AppModal';
import { STUDENT_OPS_INPUT } from '@/features/students/components/StudentPickSelect';
import { useDialog } from '@/shared/context/DialogContext';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';

interface Schedule {
  id: number;
  title: string;
  scheduled_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  class_id?: number | null;
  section_id?: number | null;
  class_name?: string | null;
  section_name?: string | null;
  remarks?: string | null;
  status?: string | null;
  present_count?: number;
  marked_count?: number;
}

interface AttendanceRow {
  student_id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_id?: number | null;
  section_id?: number | null;
  class_name?: string | null;
  section_name?: string | null;
  parent_attended: boolean;
  remarks?: string | null;
}

function calendarDate(value?: string | null) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function todayInputDate() {
  return calendarDate(new Date().toString());
}

function formatClock(value?: string | null) {
  if (!value) return '';
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  if (Number.isNaN(hours)) return value.slice(0, 5);
  const date = new Date();
  date.setHours(hours, minutes || 0, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatScheduleWhen(dateValue?: string | null, startTime?: string | null) {
  const date = calendarDate(dateValue);
  if (!date) return '';
  const label = new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = formatClock(startTime);
  return time ? `${label}, ${time}` : label;
}

const primaryButtonClass =
  'inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs text-white hover:bg-primary-700 disabled:opacity-50';
const quietButtonClass =
  'inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50';

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/90 ${className}`} />;
}

function ScheduleTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index} className="border-t border-gray-100">
          <td className="px-4 py-2.5"><Pulse className="h-3.5 w-44 max-w-full" /></td>
          <td className="px-4 py-2.5"><Pulse className="h-3.5 w-28" /></td>
          <td className="px-4 py-2.5"><Pulse className="h-3.5 w-16" /></td>
          <td className="px-4 py-2.5"><Pulse className="h-3.5 w-24" /></td>
          <td className="px-4 py-2.5"><Pulse className="h-5 w-16 rounded-full" /></td>
          <td className="px-4 py-2.5"><Pulse className="h-3.5 w-16" /></td>
          <td className="px-4 py-2.5">
            <div className="flex items-center justify-end gap-2">
              <Pulse className="h-3.5 w-16" />
              <Pulse className="h-3.5 w-12" />
              <Pulse className="h-4 w-4" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function AttendanceTableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-t border-gray-100">
          <td className="px-4 py-2.5">
            <Pulse className="h-3.5 w-36" />
            <Pulse className="mt-1.5 h-3 w-20" />
          </td>
          <td className="px-4 py-2.5"><Pulse className="h-3.5 w-16" /></td>
          <td className="px-4 py-2.5"><Pulse className="h-4 w-4 rounded" /></td>
          <td className="px-4 py-2"><Pulse className="h-8 w-full" /></td>
        </tr>
      ))}
    </>
  );
}

const emptySchedule = {
  title: '',
  scheduled_date: todayInputDate(),
  start_time: '',
  end_time: '',
  venue: '',
  class_id: '',
  section_id: '',
  remarks: '',
};

export default function PtmPage() {
  const { confirm, alert } = useDialog();
  const { selectedAcademicYear } = useEnrollmentSession();
  const [tab, setTab] = useState<'schedule' | 'attendance'>('schedule');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [sections, setSections] = useState<
    { id: number; class_id?: number; name: string; assigned_classes?: { id: number }[] }[]
  >([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptySchedule);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [attendanceClassId, setAttendanceClassId] = useState('');
  const [attendanceSectionId, setAttendanceSectionId] = useState('');
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const loadedAttendanceFor = useRef('');

  const loadSchedules = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setSchedulesLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAcademicYear?.name) params.set('academic_year', selectedAcademicYear.name);
      const res = await fetch(`/api/students/ptm/schedules?${params}`);
      const data = await res.json();
      if (data.success) setSchedules(data.data || []);
    } finally {
      setSchedulesLoading(false);
    }
  }, [selectedAcademicYear?.name]);

  useEffect(() => {
    fetch('/api/classes?active_only=true')
      .then((r) => r.json())
      .then((d) => d.success && setClasses(d.data || []));
    fetch('/api/sections?active_only=true')
      .then((r) => r.json())
      .then((d) => d.success && setSections(d.data || []));
  }, []);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    if (!selectedScheduleId) {
      setAttendance([]);
      setAttendanceClassId('');
      setAttendanceSectionId('');
      setAttendanceLoading(false);
      loadedAttendanceFor.current = '';
      return;
    }
    const schedule = schedules.find((row) => String(row.id) === selectedScheduleId);
    setAttendanceClassId(schedule?.class_id ? String(schedule.class_id) : '');
    setAttendanceSectionId(schedule?.section_id ? String(schedule.section_id) : '');
    let ignore = false;
    if (loadedAttendanceFor.current !== selectedScheduleId) setAttendanceLoading(true);
    fetch(`/api/students/ptm/attendance?schedule_id=${selectedScheduleId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!ignore && d.success) setAttendance(d.data || []);
      })
      .finally(() => {
        if (!ignore) {
          loadedAttendanceFor.current = selectedScheduleId;
          setAttendanceLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [selectedScheduleId, schedules]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptySchedule);
    setModalOpen(true);
  };

  const openReschedule = (row: Schedule) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      scheduled_date: calendarDate(row.scheduled_date) || todayInputDate(),
      start_time: row.start_time?.slice(0, 5) || '',
      end_time: row.end_time?.slice(0, 5) || '',
      venue: row.venue || '',
      class_id: row.class_id ? String(row.class_id) : '',
      section_id: row.section_id ? String(row.section_id) : '',
      remarks: row.remarks || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptySchedule);
  };

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(editingId ? `/api/students/ptm/schedules/${editingId}` : '/api/students/ptm/schedules', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, academic_year: selectedAcademicYear?.name }),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) {
      await alert(data.error || 'Failed to save schedule');
      return;
    }
    closeModal();
    loadSchedules({ silent: true });
  };

  const cancelSchedule = async (row: Schedule) => {
    const ok = await confirm(`Cancel PTM "${row.title}"? It will also be marked cancelled on the event calendar.`, {
      type: 'danger',
      confirmText: 'Cancel meeting',
    });
    if (!ok) return;
    const res = await fetch(`/api/students/ptm/schedules/${row.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to cancel meeting');
      return;
    }
    loadSchedules({ silent: true });
  };

  const removeSchedule = async (row: Schedule) => {
    const ok = await confirm(`Delete PTM "${row.title}"?`, { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    await fetch(`/api/students/ptm/schedules/${row.id}`, { method: 'DELETE' });
    if (selectedScheduleId === String(row.id)) setSelectedScheduleId('');
    loadSchedules({ silent: true });
  };

  const saveAttendance = async () => {
    if (!selectedScheduleId) return;
    setSaving(true);
    const res = await fetch('/api/students/ptm/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedule_id: Number(selectedScheduleId),
        marks: attendance.map((row) => ({
          student_id: row.student_id,
          parent_attended: row.parent_attended,
          remarks: row.remarks,
        })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) await alert(data.error || 'Failed to save attendance');
    else await loadSchedules({ silent: true });
  };

  const patchAttendance = (studentId: number, patch: Partial<AttendanceRow>) => {
    setAttendance((rows) => rows.map((row) => (row.student_id === studentId ? { ...row, ...patch } : row)));
  };

  const attendanceSections = sections.filter((section) => {
    if (!attendanceClassId) return true;
    const classId = Number(attendanceClassId);
    return section.class_id === classId || section.assigned_classes?.some((item) => item.id === classId);
  });

  const visibleAttendance = attendance.filter((row) => {
    if (attendanceClassId && Number(row.class_id) !== Number(attendanceClassId)) return false;
    if (attendanceSectionId && Number(row.section_id) !== Number(attendanceSectionId)) return false;
    return true;
  });

  const visibleSections = sections.filter((s) => {
    if (!form.class_id) return true;
    const classId = Number(form.class_id);
    return s.class_id === classId || s.assigned_classes?.some((c) => c.id === classId);
  });

  return (
    <DashboardLayout>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Parent–Teacher Meetings</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Schedule meetings and mark parent attendance. Scheduled meetings appear on the event calendar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
              {(['schedule', 'attendance'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    tab === id ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {id === 'schedule' ? 'Schedule' : 'Attendance'}
                </button>
              ))}
            </div>
            {tab === 'schedule' && (
              <button type="button" onClick={openCreate} className={primaryButtonClass}>
                <FiPlus size={14} />
                New meeting
              </button>
            )}
          </div>
        </div>

        {tab === 'schedule' ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Meetings</h2>
              {schedulesLoading ? (
                <Pulse className="h-3 w-16" />
              ) : (
                <p className="text-xs text-gray-500">
                  {schedules.length} {schedules.length === 1 ? 'meeting' : 'meetings'}
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2.5 font-semibold">Title</th>
                    <th className="px-4 py-2.5 font-semibold">When</th>
                    <th className="px-4 py-2.5 font-semibold">Class</th>
                    <th className="px-4 py-2.5 font-semibold">Venue</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Attendance</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedulesLoading ? (
                    <ScheduleTableSkeleton />
                  ) : schedules.map((row) => {
                    const cancelled = row.status === 'cancelled';
                    return (
                      <tr key={row.id} className={`border-t border-gray-100 ${cancelled ? 'bg-gray-50/80' : ''}`}>
                        <td className={`px-4 py-2.5 font-medium ${cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {row.title}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {formatScheduleWhen(row.scheduled_date, row.start_time)}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {[row.class_name, row.section_name].filter(Boolean).join(' - ') || 'All'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{row.venue || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                              cancelled
                                ? 'border-gray-200 bg-gray-100 text-gray-600'
                                : 'border-blue-200 bg-blue-100 text-blue-800'
                            }`}
                          >
                            {cancelled ? 'Cancelled' : 'Scheduled'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {row.present_count || 0}/{row.marked_count || 0} present
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => openReschedule(row)}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 hover:text-primary-600"
                            >
                              <FiCalendar size={14} />
                              Reschedule
                            </button>
                            {!cancelled && (
                              <button
                                type="button"
                                onClick={() => cancelSchedule(row)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-amber-50 hover:text-amber-700"
                              >
                                <FiXCircle size={14} />
                                Cancel
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeSchedule(row)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!schedulesLoading && schedules.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <p className="text-sm font-medium text-gray-700">No meetings yet</p>
                        <p className="mt-1 text-xs text-gray-500">Create a meeting to show it on the event calendar.</p>
                        <button type="button" onClick={openCreate} className={`${primaryButtonClass} mt-3`}>
                          <FiPlus size={14} />
                          New meeting
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="grid gap-2 border-b border-gray-200 px-4 py-3 sm:grid-cols-3">
              {schedulesLoading ? (
                <>
                  <Pulse className="h-9 w-full" />
                  <Pulse className="h-9 w-full" />
                  <Pulse className="h-9 w-full" />
                </>
              ) : (
              <>
              <select
                className={STUDENT_OPS_INPUT}
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
              >
                <option value="">Select a meeting</option>
                {schedules
                  .filter((row) => row.status !== 'cancelled')
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.title} — {formatScheduleWhen(row.scheduled_date, row.start_time)}
                    </option>
                  ))}
              </select>
              <select
                className={STUDENT_OPS_INPUT}
                value={attendanceClassId}
                onChange={(e) => {
                  setAttendanceClassId(e.target.value);
                  setAttendanceSectionId('');
                }}
                disabled={!selectedScheduleId}
              >
                <option value="">All classes</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                className={STUDENT_OPS_INPUT}
                value={attendanceSectionId}
                onChange={(e) => setAttendanceSectionId(e.target.value)}
                disabled={!selectedScheduleId}
              >
                <option value="">All sections</option>
                {attendanceSections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              </>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2.5 font-semibold">Student</th>
                    <th className="px-4 py-2.5 font-semibold">Class</th>
                    <th className="px-4 py-2.5 font-semibold">Parent attended</th>
                    <th className="px-4 py-2.5 font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {schedulesLoading || attendanceLoading ? (
                    <AttendanceTableSkeleton />
                  ) : visibleAttendance.map((row) => (
                    <tr key={row.student_id} className="border-t border-gray-100">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900">
                          {row.first_name} {row.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{row.admission_number}</p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {[row.class_name, row.section_name].filter(Boolean).join(' - ') || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary-600"
                          checked={row.parent_attended}
                          onChange={(e) => patchAttendance(row.student_id, { parent_attended: e.target.checked })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          className={STUDENT_OPS_INPUT}
                          value={row.remarks || ''}
                          onChange={(e) => patchAttendance(row.student_id, { remarks: e.target.value })}
                          placeholder="Optional note"
                        />
                      </td>
                    </tr>
                  ))}
                  {!schedulesLoading && !attendanceLoading && !selectedScheduleId && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center">
                        <p className="text-sm font-medium text-gray-700">Choose a meeting</p>
                        <p className="mt-1 text-xs text-gray-500">Then filter by class and section to mark attendance.</p>
                      </td>
                    </tr>
                  )}
                  {!attendanceLoading && selectedScheduleId && visibleAttendance.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center">
                        <p className="text-sm font-medium text-gray-700">No students in this filter</p>
                        <p className="mt-1 text-xs text-gray-500">Try another class or section.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {!attendanceLoading && visibleAttendance.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-2.5">
                <p className="text-xs text-gray-500">
                  {visibleAttendance.filter((row) => row.parent_attended).length} of {visibleAttendance.length} marked present
                </p>
                <button type="button" onClick={saveAttendance} disabled={saving} className={primaryButtonClass}>
                  {saving ? 'Saving…' : 'Save attendance'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AppModal open={modalOpen} onClose={closeModal}>
        <div className={APP_MODAL_PANEL_STRUCTURED}>
          <div className={APP_MODAL_HEADER}>
            <div>
              <h2 className="text-lg font-medium text-gray-900">{editingId ? 'Reschedule meeting' : 'New meeting'}</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {editingId
                  ? 'The new date and time are updated on the event calendar.'
                  : 'This meeting is added to the event calendar.'}
              </p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              aria-label="Close"
            >
              <FiX size={18} />
            </button>
          </div>
          <form id="ptm-form" onSubmit={saveSchedule} className={`${APP_MODAL_BODY} grid grid-cols-1 gap-4 p-6 md:grid-cols-2`}>
            <label className="text-xs font-medium text-gray-700 md:col-span-2">
              Title
              <input required className={`${STUDENT_OPS_INPUT} mt-1`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Date
              <input type="date" required className={`${STUDENT_OPS_INPUT} mt-1`} value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Venue
              <input className={`${STUDENT_OPS_INPUT} mt-1`} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Start
              <input type="time" className={`${STUDENT_OPS_INPUT} mt-1`} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-gray-700">
              End
              <input type="time" className={`${STUDENT_OPS_INPUT} mt-1`} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Class
              <select className={`${STUDENT_OPS_INPUT} mt-1`} value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: '' })}>
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-700">
              Section
              <select className={`${STUDENT_OPS_INPUT} mt-1`} value={form.section_id} onChange={(e) => setForm({ ...form, section_id: e.target.value })}>
                <option value="">All sections</option>
                {visibleSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </form>
          <div className={APP_MODAL_FOOTER}>
            <button type="button" onClick={closeModal} className={quietButtonClass}>
              Cancel
            </button>
            <button type="submit" form="ptm-form" disabled={saving} className={primaryButtonClass}>
              {saving ? 'Saving…' : editingId ? 'Save schedule' : 'Save'}
            </button>
          </div>
        </div>
      </AppModal>
    </DashboardLayout>
  );
}
