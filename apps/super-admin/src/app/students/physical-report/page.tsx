'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus, FiPrinter, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import StudentPickSelect, { STUDENT_OPS_INPUT } from '@/features/students/components/StudentPickSelect';
import { printHtmlDocument } from '@/features/students/utils/print-html';
import { useDialog } from '@/shared/context/DialogContext';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { calculateBmi } from '@/lib/student-operations-utils';

interface PhysicalReport {
  id: number;
  student_id: number;
  report_date: string;
  first_name?: string | null;
  last_name?: string | null;
  admission_number?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  bmi?: number | null;
  chest_cm?: number | null;
  vision_left?: string | null;
  vision_right?: string | null;
  blood_group?: string | null;
  remarks?: string | null;
  student_snapshot?: { full_name?: string; admission_number?: string; class_name?: string };
}

const emptyForm = {
  student_id: '',
  class_id: '',
  report_date: new Date().toISOString().split('T')[0],
  height_cm: '',
  weight_kg: '',
  chest_cm: '',
  vision_left: '',
  vision_right: '',
  blood_group: '',
  remarks: '',
};

export default function PhysicalReportPage() {
  const { confirm, alert } = useDialog();
  const { selectedAcademicYear } = useEnrollmentSession();
  const [rows, setRows] = useState<PhysicalReport[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (classFilter) params.set('class_id', classFilter);
    const res = await fetch(`/api/students/physical-reports?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
    setLoading(false);
  }, [classFilter]);

  const visibleRows = useMemo(() => {
    if (selectedStudentId) {
      return rows.filter((row) => String(row.student_id) === selectedStudentId);
    }
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const name = row.student_snapshot?.full_name || `${row.first_name || ''} ${row.last_name || ''}`;
      const admission = row.student_snapshot?.admission_number || row.admission_number || '';
      return name.toLowerCase().includes(query) || admission.toLowerCase().includes(query);
    });
  }, [rows, search, selectedStudentId]);

  useEffect(() => {
    fetch('/api/classes?active_only=true')
      .then((r) => r.json())
      .then((d) => d.success && setClasses(d.data || []));
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/students/physical-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, academic_year: selectedAcademicYear?.name }),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) {
      await alert(data.error || 'Failed to save');
      return;
    }
    setModalOpen(false);
    setForm(emptyForm);
    load();
  };

  const remove = async (row: PhysicalReport) => {
    const ok = await confirm('Delete this physical report?', { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    await fetch(`/api/students/physical-reports/${row.id}`, { method: 'DELETE' });
    load();
  };

  const printRows = () => {
    const body = `<h1>Physical Report</h1>
      <p class="muted">${selectedAcademicYear?.name || ''}</p>
      <table>
        <thead><tr><th>Date</th><th>Admission</th><th>Student</th><th>Class</th><th>Height</th><th>Weight</th><th>BMI</th><th>Vision</th></tr></thead>
        <tbody>
          ${visibleRows
            .map(
              (row) => `<tr>
                <td>${row.report_date?.slice(0, 10) || ''}</td>
                <td>${row.student_snapshot?.admission_number || ''}</td>
                <td>${row.student_snapshot?.full_name || ''}</td>
                <td>${row.student_snapshot?.class_name || ''}</td>
                <td>${row.height_cm ?? ''}</td>
                <td>${row.weight_kg ?? ''}</td>
                <td>${row.bmi ?? ''}</td>
                <td>${[row.vision_left, row.vision_right].filter(Boolean).join(' / ')}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
    printHtmlDocument('Physical Report', body);
  };

  const previewBmi = calculateBmi(Number(form.height_cm) || null, Number(form.weight_kg) || null);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Physical Report</h1>
            <p className="mt-1 text-sm text-gray-500">Record height, weight, vision, and BMI by student.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={printRows} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm">
              <FiPrinter /> Print
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white"
            >
              <FiPlus /> Add Report
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <StudentPickSelect
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              onQueryChange={setSearch}
              classId={classFilter}
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setSelectedStudentId('');
              setSearch('');
            }}
            className="w-52 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Height</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Weight</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">BMI</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Vision</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    {search.trim() ? 'No reports match your search.' : 'No physical reports yet.'}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-2.5">{row.report_date?.slice(0, 10)}</td>
                    <td className="px-4 py-2.5">
                      {row.student_snapshot?.full_name || [row.first_name, row.last_name].filter(Boolean).join(' ')}
                      <div className="text-xs text-gray-500">
                        {row.student_snapshot?.admission_number || row.admission_number}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{row.height_cm ?? '—'}</td>
                    <td className="px-4 py-2.5">{row.weight_kg ?? '—'}</td>
                    <td className="px-4 py-2.5">{row.bmi ?? '—'}</td>
                    <td className="px-4 py-2.5">{[row.vision_left, row.vision_right].filter(Boolean).join(' / ') || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => remove(row)} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AppModal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className={APP_MODAL_PANEL}>
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-medium">Add Physical Report</h2>
          </div>
          <form id="phys-form" onSubmit={save} className="space-y-4 overflow-y-auto p-6">
            <div className="flex items-end gap-3">
              <label className="w-52 shrink-0 text-sm">
                Class
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                  value={form.class_id}
                  onChange={(e) => setForm({ ...form, class_id: e.target.value, student_id: '' })}
                >
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-0 flex-1 text-sm">
                Student
                <div className="mt-1">
                  <StudentPickSelect
                    value={form.student_id}
                    onChange={(student_id) => setForm({ ...form, student_id })}
                    classId={form.class_id}
                  />
                </div>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="text-sm">
                Date
                <input type="date" className={`${STUDENT_OPS_INPUT} mt-1`} value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} />
              </label>
              <label className="text-sm">
                Height (cm)
                <input className={`${STUDENT_OPS_INPUT} mt-1`} value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} />
              </label>
              <label className="text-sm">
                Weight (kg)
                <input className={`${STUDENT_OPS_INPUT} mt-1`} value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
              </label>
              <label className="text-sm">
                BMI
                <input className={`${STUDENT_OPS_INPUT} mt-1 bg-gray-50`} readOnly value={previewBmi ?? ''} />
              </label>
              <label className="text-sm">
                Chest (cm)
                <input className={`${STUDENT_OPS_INPUT} mt-1`} value={form.chest_cm} onChange={(e) => setForm({ ...form, chest_cm: e.target.value })} />
              </label>
              <label className="text-sm">
                Blood group
                <input className={`${STUDENT_OPS_INPUT} mt-1`} value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} />
              </label>
              <label className="text-sm">
                Vision L
                <input className={`${STUDENT_OPS_INPUT} mt-1`} value={form.vision_left} onChange={(e) => setForm({ ...form, vision_left: e.target.value })} />
              </label>
              <label className="text-sm">
                Vision R
                <input className={`${STUDENT_OPS_INPUT} mt-1`} value={form.vision_right} onChange={(e) => setForm({ ...form, vision_right: e.target.value })} />
              </label>
            </div>
            <label className="block text-sm">
              Remarks
              <textarea className={`${STUDENT_OPS_INPUT} mt-1`} rows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </label>
          </form>
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" form="phys-form" disabled={saving} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white">
              Save
            </button>
          </div>
        </div>
      </AppModal>
    </DashboardLayout>
  );
}
