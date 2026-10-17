'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { calculateBmi } from '@/lib/student-operations-utils';
import { BLOOD_GROUPS } from '@/shared/constants/student-personal';

interface PhysicalReport {
  id: number;
  report_date: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  bmi?: number | null;
  chest_cm?: number | null;
  vision_left?: string | null;
  vision_right?: string | null;
  blood_group?: string | null;
  remarks?: string | null;
}

interface StudentPhysicalRecordsPanelProps {
  studentId: number;
  defaultBloodGroup?: string;
}

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';

function emptyForm(bloodGroup = '') {
  return {
    report_date: new Date().toISOString().split('T')[0],
    height_cm: '',
    weight_kg: '',
    chest_cm: '',
    vision_left: '',
    vision_right: '',
    blood_group: bloodGroup,
    remarks: '',
  };
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

export default function StudentPhysicalRecordsPanel({
  studentId,
  defaultBloodGroup = '',
}: StudentPhysicalRecordsPanelProps) {
  const { confirm, alert } = useDialog();
  const { selectedAcademicYear } = useEnrollmentSession();
  const [rows, setRows] = useState<PhysicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => emptyForm(defaultBloodGroup));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/physical-reports?student_id=${studentId}`);
      const data = await res.json();
      if (data.success) setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    setAdding(false);
    load();
  }, [load]);

  useEffect(() => {
    if (!adding) return;
    setForm((prev) => ({ ...prev, blood_group: prev.blood_group || defaultBloodGroup }));
  }, [adding, defaultBloodGroup]);

  const previewBmi = calculateBmi(Number(form.height_cm) || null, Number(form.weight_kg) || null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.height_cm && !form.weight_kg && !form.vision_left && !form.vision_right) {
      await alert('Enter height, weight, or vision to save a physical record.', {
        title: 'Missing details',
        type: 'warning',
      });
      return;
    }
    setSaving(true);
    const res = await fetch('/api/students/physical-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        student_id: studentId,
        academic_year: selectedAcademicYear?.name,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) {
      await alert(data.error || 'Failed to save physical record');
      return;
    }
    setAdding(false);
    setForm(emptyForm(defaultBloodGroup));
    load();
  };

  const remove = async (row: PhysicalReport) => {
    const ok = await confirm('Delete this physical record?', { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    await fetch(`/api/students/physical-reports/${row.id}`, { method: 'DELETE' });
    load();
  };

  const latest = rows[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Height, weight, vision, and BMI recorded for this student.</p>
        <button
          type="button"
          onClick={() => {
            setAdding((prev) => !prev);
            setForm(emptyForm(defaultBloodGroup));
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
            adding
              ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          <FiPlus />
          {adding ? 'Cancel' : 'Add record'}
        </button>
      </div>

      {latest && !adding && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-100 bg-white px-3 py-2.5">
            <p className="text-xs text-gray-500">Latest height</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              {latest.height_cm ? `${latest.height_cm} cm` : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white px-3 py-2.5">
            <p className="text-xs text-gray-500">Latest weight</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              {latest.weight_kg ? `${latest.weight_kg} kg` : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white px-3 py-2.5">
            <p className="text-xs text-gray-500">BMI</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">{latest.bmi ?? '—'}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white px-3 py-2.5">
            <p className="text-xs text-gray-500">Vision</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              {[latest.vision_left, latest.vision_right].filter(Boolean).join(' / ') || '—'}
            </p>
          </div>
        </div>
      )}

      {adding && (
        <form onSubmit={save} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">New physical record</h3>
            <p className="text-xs text-gray-500">BMI is calculated automatically from height and weight.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Date">
              <input
                type="date"
                className={fieldClass}
                value={form.report_date}
                onChange={(e) => setForm({ ...form, report_date: e.target.value })}
              />
            </Field>
            <Field label="Height (cm)">
              <input
                className={fieldClass}
                placeholder="e.g. 142"
                value={form.height_cm}
                onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
              />
            </Field>
            <Field label="Weight (kg)">
              <input
                className={fieldClass}
                placeholder="e.g. 36"
                value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              />
            </Field>
            <Field label="BMI">
              <input className={`${fieldClass} bg-gray-50`} readOnly value={previewBmi ?? ''} placeholder="Auto" />
            </Field>
            <Field label="Chest (cm)">
              <input
                className={fieldClass}
                value={form.chest_cm}
                onChange={(e) => setForm({ ...form, chest_cm: e.target.value })}
              />
            </Field>
            <Field label="Vision left">
              <input
                className={fieldClass}
                placeholder="e.g. 6/6"
                value={form.vision_left}
                onChange={(e) => setForm({ ...form, vision_left: e.target.value })}
              />
            </Field>
            <Field label="Vision right">
              <input
                className={fieldClass}
                placeholder="e.g. 6/6"
                value={form.vision_right}
                onChange={(e) => setForm({ ...form, vision_right: e.target.value })}
              />
            </Field>
            <Field label="Blood group">
              <select
                className={fieldClass}
                value={form.blood_group}
                onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
              >
                <option value="">Select</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
                {form.blood_group &&
                  !BLOOD_GROUPS.includes(form.blood_group as (typeof BLOOD_GROUPS)[number]) && (
                    <option value={form.blood_group}>{form.blood_group}</option>
                  )}
              </select>
            </Field>
            <Field label="Remarks" className="sm:col-span-2 lg:col-span-4">
              <input
                className={fieldClass}
                placeholder="Optional notes"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save record'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-600">
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Height</th>
              <th className="px-4 py-2.5">Weight</th>
              <th className="px-4 py-2.5">BMI</th>
              <th className="px-4 py-2.5">Chest</th>
              <th className="px-4 py-2.5">Vision</th>
              <th className="px-4 py-2.5">Remarks</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  Loading physical records...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  No physical records for this student yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-2.5">{row.report_date?.slice(0, 10)}</td>
                  <td className="px-4 py-2.5">{row.height_cm ?? '—'}</td>
                  <td className="px-4 py-2.5">{row.weight_kg ?? '—'}</td>
                  <td className="px-4 py-2.5">{row.bmi ?? '—'}</td>
                  <td className="px-4 py-2.5">{row.chest_cm ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    {[row.vision_left, row.vision_right].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-2.5 text-gray-600">{row.remarks || '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50"
                      aria-label="Delete physical record"
                    >
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
  );
}
