'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiHeart } from 'react-icons/fi';
import type { StudentMedicalRecord } from '@/shared/types';

interface MedicalTabProps {
  studentId: number;
}

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

export default function MedicalTab({ studentId }: MedicalTabProps) {
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
        setSuccess('Medical record saved successfully');
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

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading medical record...</div>;
  }

  return (
    <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-gray-900 font-semibold">
        <FiHeart className="text-primary-600" />
        Medical Information
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            value={form.blood_group}
            onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
            placeholder="e.g. B+"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            value={form.doctor_name}
            onChange={(e) => setForm({ ...form, doctor_name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Contact</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            value={form.doctor_contact}
            onChange={(e) => setForm({ ...form, doctor_contact: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            value={form.emergency_contact}
            onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            value={form.allergies}
            onChange={(e) => setForm({ ...form, allergies: e.target.value })}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Chronic Disease</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            value={form.chronic_disease}
            onChange={(e) => setForm({ ...form, chronic_disease: e.target.value })}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Disability</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            value={form.disability}
            onChange={(e) => setForm({ ...form, disability: e.target.value })}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Medical Notes</label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            value={form.medical_notes}
            onChange={(e) => setForm({ ...form, medical_notes: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Medical Record'}
        </button>
      </div>
    </form>
  );
}
