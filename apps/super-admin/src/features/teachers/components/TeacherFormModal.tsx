'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useEffect, useState } from 'react';
import { FiSave, FiX } from 'react-icons/fi';
import type { Staff } from '@/shared/types';

const selectClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500';

export interface TeacherRecord extends Staff {
  assignment_count?: number;
  department_name?: string | null;
  designation_name?: string | null;
}

interface TeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingTeacher?: TeacherRecord | null;
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  gender: 'Male' as 'Male' | 'Female' | 'Other',
  qualification: '',
  designation: 'Teacher',
  experience_years: '',
  date_of_joining: new Date().toISOString().split('T')[0],
  employment_type: 'full_time' as 'full_time' | 'part_time' | 'contract' | 'temporary',
  status: 'active' as 'active' | 'inactive' | 'resigned' | 'terminated',
  notes: '',
};

function formatDate(value?: Date | string | null) {
  if (!value) return '';
  const raw = typeof value === 'string' ? value : value.toISOString();
  return raw.split('T')[0];
}

export default function TeacherFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingTeacher,
}: TeacherFormModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingTeacher) {
      setForm({
        first_name: editingTeacher.first_name || '',
        last_name: editingTeacher.last_name || '',
        phone: editingTeacher.phone || '',
        email: editingTeacher.email || '',
        gender: editingTeacher.gender || 'Male',
        qualification: editingTeacher.qualification || '',
        designation: editingTeacher.designation || editingTeacher.designation_name || 'Teacher',
        experience_years:
          editingTeacher.experience_years != null ? String(editingTeacher.experience_years) : '',
        date_of_joining: formatDate(editingTeacher.date_of_joining) || EMPTY_FORM.date_of_joining,
        employment_type: editingTeacher.employment_type || 'full_time',
        status: editingTeacher.status || 'active',
        notes: editingTeacher.notes || '',
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        date_of_joining: new Date().toISOString().split('T')[0],
      });
    }
  }, [isOpen, editingTeacher]);

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) {
      setError('First name, last name, and phone are required');
      return;
    }
    if (!form.date_of_joining) {
      setError('Date of joining is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        gender: form.gender,
        qualification: form.qualification.trim() || null,
        designation: form.designation.trim() || 'Teacher',
        experience_years: form.experience_years ? parseInt(form.experience_years, 10) : null,
        date_of_joining: form.date_of_joining,
        employment_type: form.employment_type,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      const url = editingTeacher ? `/api/teachers/${editingTeacher.id}` : '/api/teachers';
      const res = await fetch(url, {
        method: editingTeacher ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to save teacher');
        return;
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save teacher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div className={APP_MODAL_PANEL}>
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {editingTeacher ? 'Edit teacher' : 'Add teacher'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          aria-label="Close"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">First name *</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className={selectClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Last name *</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className={selectClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={selectClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={selectClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
            <select
              value={form.gender}
              onChange={(e) =>
                setForm({ ...form, gender: e.target.value as 'Male' | 'Female' | 'Other' })
              }
              className={selectClass}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
            <input
              type="text"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              className={selectClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Qualification</label>
            <input
              type="text"
              value={form.qualification}
              onChange={(e) => setForm({ ...form, qualification: e.target.value })}
              className={selectClass}
              placeholder="e.g. B.Ed, M.Sc"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Experience (years)</label>
            <input
              type="number"
              min={0}
              value={form.experience_years}
              onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
              className={selectClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date of joining *</label>
            <input
              type="date"
              value={form.date_of_joining}
              onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })}
              className={selectClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Employment type *</label>
            <select
              value={form.employment_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  employment_type: e.target.value as
                    | 'full_time'
                    | 'part_time'
                    | 'contract'
                    | 'temporary',
                })
              }
              className={selectClass}
            >
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>
          {editingTeacher && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as
                      | 'active'
                      | 'inactive'
                      | 'resigned'
                      | 'terminated',
                  })
                }
                className={selectClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="resigned">Resigned</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className={selectClass}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <FiSave className="w-4 h-4" />
          {saving ? 'Saving...' : editingTeacher ? 'Update teacher' : 'Create teacher'}
        </button>
      </div>
      </div>
    </AppModal>
  );
}
