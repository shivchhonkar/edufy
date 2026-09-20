'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
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
  present_count?: number;
  marked_count?: number;
}

interface AttendanceRow {
  student_id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  parent_attended: boolean;
  remarks?: string | null;
}

const emptySchedule = {
  title: '',
  scheduled_date: new Date().toISOString().split('T')[0],
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
  const [form, setForm] = useState(emptySchedule);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [saving, setSaving] = useState(false);

  const loadSchedules = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedAcademicYear?.name) params.set('academic_year', selectedAcademicYear.name);
    const res = await fetch(`/api/students/ptm/schedules?${params}`);
    const data = await res.json();
    if (data.success) setSchedules(data.data || []);
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
      return;
    }
    fetch(`/api/students/ptm/attendance?schedule_id=${selectedScheduleId}`)
      .then((r) => r.json())
      .then((d) => d.success && setAttendance(d.data || []));
  }, [selectedScheduleId]);

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/students/ptm/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, academic_year: selectedAcademicYear?.name }),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) {
      await alert(data.error || 'Failed to save schedule');
      return;
    }
    setModalOpen(false);
    setForm(emptySchedule);
    loadSchedules();
  };

  const removeSchedule = async (row: Schedule) => {
    const ok = await confirm(`Delete PTM "${row.title}"?`, { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    await fetch(`/api/students/ptm/schedules/${row.id}`, { method: 'DELETE' });
    if (selectedScheduleId === String(row.id)) setSelectedScheduleId('');
    loadSchedules();
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
    else await loadSchedules();
  };

  const visibleSections = sections.filter((s) => {
    if (!form.class_id) return true;
    const classId = Number(form.class_id);
    return s.class_id === classId || s.assigned_classes?.some((c) => c.id === classId);
  });

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">PTM</h1>
            <p className="mt-1 text-sm text-gray-500">Create PTM schedules and mark parent attendance.</p>
          </div>
          {tab === 'schedule' && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white"
            >
              <FiPlus /> PTM Schedule Creation
            </button>
          )}
        </div>

        <div className="mb-4 flex gap-2">
          {(['schedule', 'attendance'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                tab === id ? 'bg-primary-600 text-white' : 'border bg-white text-gray-700'
              }`}
            >
              {id === 'schedule' ? 'PTM Schedule' : 'PTM Attendance'}
            </button>
          ))}
        </div>

        {tab === 'schedule' ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Class</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Venue</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Attendance</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {schedules.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-2.5 font-medium">{row.title}</td>
                    <td className="px-4 py-2.5">
                      {row.scheduled_date?.slice(0, 10)} {row.start_time || ''}
                    </td>
                    <td className="px-4 py-2.5">
                      {[row.class_name, row.section_name].filter(Boolean).join(' - ') || 'All'}
                    </td>
                    <td className="px-4 py-2.5">{row.venue || '—'}</td>
                    <td className="px-4 py-2.5">
                      {row.present_count || 0}/{row.marked_count || 0}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => removeSchedule(row)} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      No PTM schedules yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4">
            <select
              className={`${STUDENT_OPS_INPUT} max-w-md`}
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
            >
              <option value="">Select a PTM schedule</option>
              {schedules.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title} — {row.scheduled_date?.slice(0, 10)}
                </option>
              ))}
            </select>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Parent attended</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((row, index) => (
                    <tr key={row.student_id} className="border-t">
                      <td className="px-4 py-2.5">
                        {row.first_name} {row.last_name}
                        <div className="text-xs text-gray-500">{row.admission_number}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={row.parent_attended}
                          onChange={(e) => {
                            const next = [...attendance];
                            next[index] = { ...row, parent_attended: e.target.checked };
                            setAttendance(next);
                          }}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          className={STUDENT_OPS_INPUT}
                          value={row.remarks || ''}
                          onChange={(e) => {
                            const next = [...attendance];
                            next[index] = { ...row, remarks: e.target.value };
                            setAttendance(next);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                  {selectedScheduleId && attendance.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-gray-400">
                        No students found for this class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {attendance.length > 0 && (
              <button
                type="button"
                onClick={saveAttendance}
                disabled={saving}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white"
              >
                Save attendance
              </button>
            )}
          </div>
        )}
      </div>

      <AppModal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className={APP_MODAL_PANEL}>
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-medium">PTM Schedule Creation</h2>
          </div>
          <form id="ptm-form" onSubmit={saveSchedule} className="grid grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              Title
              <input required className={`${STUDENT_OPS_INPUT} mt-1`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="text-sm">
              Date
              <input type="date" required className={`${STUDENT_OPS_INPUT} mt-1`} value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
            </label>
            <label className="text-sm">
              Venue
              <input className={`${STUDENT_OPS_INPUT} mt-1`} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </label>
            <label className="text-sm">
              Start
              <input type="time" className={`${STUDENT_OPS_INPUT} mt-1`} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </label>
            <label className="text-sm">
              End
              <input type="time" className={`${STUDENT_OPS_INPUT} mt-1`} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </label>
            <label className="text-sm">
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
            <label className="text-sm">
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
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" form="ptm-form" disabled={saving} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white">
              Save
            </button>
          </div>
        </div>
      </AppModal>
    </DashboardLayout>
  );
}
