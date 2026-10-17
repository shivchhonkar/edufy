'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiActivity, FiHeart } from 'react-icons/fi';
import type { StudentMedicalRecord } from '@/shared/types';
import { BLOOD_GROUPS } from '@/shared/constants/student-personal';
import StudentPhysicalRecordsPanel from '@/features/students/components/profile/StudentPhysicalRecordsPanel';

interface MedicalTabProps {
  studentId: number;
  onSaved?: () => void;
}

type MedicalSubTab = 'medical' | 'physical';

const emptyForm = {
  blood_group: '',
  allergies: '',
  chronic_disease: '',
  disability: '',
  doctor_name: '',
  doctor_contact: '',
  emergency_contact: '',
  medical_notes: '',
};

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';

function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

export default function MedicalTab({ studentId, onSaved }: MedicalTabProps) {
  const [subTab, setSubTab] = useState<MedicalSubTab>('medical');
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMedical = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/students/${studentId}/medical`);
      const data = await res.json();
      if (data.success && data.data) {
        const m: StudentMedicalRecord = data.data;
        setForm({
          blood_group: m.blood_group || '',
          allergies: m.allergies || '',
          chronic_disease: m.chronic_disease || '',
          disability: m.disability || '',
          doctor_name: m.doctor_name || '',
          doctor_contact: m.doctor_contact || '',
          emergency_contact: m.emergency_contact || '',
          medical_notes: m.medical_notes || '',
        });
      } else if (!data.success) {
        setError(data.error || 'Failed to load medical record');
      }
    } catch {
      setError('Failed to load medical record');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    setSubTab('medical');
    setSuccess('');
    fetchMedical();
  }, [fetchMedical]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/students/${studentId}/medical`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Medical information saved');
        onSaved?.();
        if (data.data) {
          const m: StudentMedicalRecord = data.data;
          setForm({
            blood_group: m.blood_group || '',
            allergies: m.allergies || '',
            chronic_disease: m.chronic_disease || '',
            disability: m.disability || '',
            doctor_name: m.doctor_name || '',
            doctor_contact: m.doctor_contact || '',
            emergency_contact: m.emergency_contact || '',
            medical_notes: m.medical_notes || '',
          });
        }
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save medical record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => setSubTab('medical')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
            subTab === 'medical'
              ? 'bg-white font-medium text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FiHeart className="h-3.5 w-3.5" />
          Medical Information
        </button>
        <button
          type="button"
          onClick={() => setSubTab('physical')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
            subTab === 'physical'
              ? 'bg-white font-medium text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FiActivity className="h-3.5 w-3.5" />
          Physical Records
        </button>
      </div>

      {subTab === 'medical' &&
        (loading ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            Loading medical information...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-2.5">
                <h3 className="text-sm font-semibold text-gray-800">Care contacts</h3>
                <p className="text-xs text-gray-500">Doctor and emergency details for this student.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Blood group" hint="Synced with the Profile tab.">
                  <select
                    className={fieldClass}
                    value={form.blood_group}
                    onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                  >
                    <option value="">Select blood group</option>
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
                <Field label="Doctor name">
                  <input
                    className={fieldClass}
                    placeholder="e.g. Dr. Sharma"
                    value={form.doctor_name}
                    onChange={(e) => setForm({ ...form, doctor_name: e.target.value })}
                  />
                </Field>
                <Field label="Doctor contact">
                  <input
                    className={fieldClass}
                    placeholder="Mobile or clinic number"
                    value={form.doctor_contact}
                    onChange={(e) => setForm({ ...form, doctor_contact: e.target.value })}
                  />
                </Field>
                <Field label="Emergency contact" className="sm:col-span-2 lg:col-span-1">
                  <input
                    className={fieldClass}
                    placeholder="Parent or guardian number"
                    value={form.emergency_contact}
                    onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-2.5">
                <h3 className="text-sm font-semibold text-gray-800">Conditions</h3>
                <p className="text-xs text-gray-500">Allergies, ongoing conditions, and notes staff should know.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
                <Field label="Allergies">
                  <textarea
                    rows={3}
                    className={fieldClass}
                    placeholder="Food, medicine, or other allergies"
                    value={form.allergies}
                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                  />
                </Field>
                <Field label="Chronic disease">
                  <textarea
                    rows={3}
                    className={fieldClass}
                    placeholder="Asthma, diabetes, or other ongoing conditions"
                    value={form.chronic_disease}
                    onChange={(e) => setForm({ ...form, chronic_disease: e.target.value })}
                  />
                </Field>
                <Field label="Disability">
                  <input
                    className={fieldClass}
                    placeholder="If applicable"
                    value={form.disability}
                    onChange={(e) => setForm({ ...form, disability: e.target.value })}
                  />
                </Field>
                <Field label="Medical notes">
                  <textarea
                    rows={3}
                    className={fieldClass}
                    placeholder="Any other health notes for staff"
                    value={form.medical_notes}
                    onChange={(e) => setForm({ ...form, medical_notes: e.target.value })}
                  />
                </Field>
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save medical information'}
              </button>
            </div>
          </form>
        ))}

      {subTab === 'physical' && (
        <StudentPhysicalRecordsPanel studentId={studentId} defaultBloodGroup={form.blood_group} />
      )}
    </div>
  );
}
