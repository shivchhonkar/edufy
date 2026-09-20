'use client';

import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import type { HolidayRecord, HolidayScope } from '@/lib/holiday-utils';

interface ClassOption {
  id: number;
  name: string;
}

interface HolidayFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  academicYears: { id: number; name: string }[];
  classes: ClassOption[];
  defaultAcademicYear: string;
  holiday?: HolidayRecord | null;
}

interface HolidayFormState {
  academic_year: string;
  scope: HolidayScope;
  class_ids: number[];
  start_date: string;
  end_date: string;
  remark: string;
}

const INPUT =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none bg-white';

function emptyForm(academicYear: string): HolidayFormState {
  return {
    academic_year: academicYear,
    scope: 'school',
    class_ids: [],
    start_date: '',
    end_date: '',
    remark: '',
  };
}

export default function HolidayFormModal({
  isOpen,
  onClose,
  onSuccess,
  academicYears,
  classes,
  defaultAcademicYear,
  holiday,
}: HolidayFormModalProps) {
  const [form, setForm] = useState<HolidayFormState>(emptyForm(defaultAcademicYear));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (holiday) {
      setForm({
        academic_year: holiday.academic_year || defaultAcademicYear,
        scope: holiday.scope,
        class_ids: holiday.class_id ? [holiday.class_id] : [],
        start_date: holiday.start_date,
        end_date: holiday.end_date,
        remark: holiday.remark || holiday.name || '',
      });
    } else {
      setForm(emptyForm(defaultAcademicYear));
    }
    setError('');
  }, [isOpen, holiday, defaultAcademicYear]);

  const toggleClass = (classId: number) => {
    setForm((prev) => ({
      ...prev,
      class_ids: prev.class_ids.includes(classId)
        ? prev.class_ids.filter((id) => id !== classId)
        : [...prev.class_ids, classId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.academic_year) {
      setError('Session is required');
      return;
    }
    if (!form.start_date || !form.end_date) {
      setError('From date and to date are required');
      return;
    }
    if (form.end_date < form.start_date) {
      setError('To date cannot be before from date');
      return;
    }
    if (!form.remark.trim()) {
      setError('Remark is required');
      return;
    }
    if (form.scope === 'class' && form.class_ids.length === 0) {
      setError('Select at least one class for a class-wise holiday');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        academic_year: form.academic_year,
        scope: form.scope,
        class_id: form.scope === 'class' ? form.class_ids[0] : null,
        class_ids: form.scope === 'class' ? form.class_ids : [],
        start_date: form.start_date,
        end_date: form.end_date,
        remark: form.remark.trim(),
      };

      const response = await fetch(holiday ? `/api/holidays/${holiday.id}` : '/api/holidays', {
        method: holiday ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to save holiday');
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div className={`${APP_MODAL_PANEL} max-w-xl`}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900">
            {holiday ? 'Edit Holiday' : 'Add Holiday'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Session <span className="text-red-500">*</span>
            </span>
            <select
              className={INPUT}
              value={form.academic_year}
              onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
              required
            >
              <option value="">Select session</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.name}>
                  {year.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700">
              Holiday for <span className="text-red-500">*</span>
            </span>
            <div className="flex gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="scope"
                  checked={form.scope === 'school'}
                  onChange={() => setForm({ ...form, scope: 'school', class_ids: [] })}
                />
                School-wise
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="scope"
                  checked={form.scope === 'class'}
                  onChange={() => setForm({ ...form, scope: 'class' })}
                />
                Class-wise
              </label>
            </div>
          </div>

          {form.scope === 'class' && (
            <div>
              <span className="mb-2 block text-sm font-medium text-gray-700">
                Class {holiday ? '' : '(one or more)'} <span className="text-red-500">*</span>
              </span>
              {holiday ? (
                <select
                  className={INPUT}
                  value={form.class_ids[0] || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      class_ids: e.target.value ? [parseInt(e.target.value, 10)] : [],
                    })
                  }
                  required
                >
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                  {classes.length === 0 ? (
                    <p className="text-sm text-gray-500">No classes found.</p>
                  ) : (
                    classes.map((cls) => (
                      <label key={cls.id} className="flex items-center gap-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={form.class_ids.includes(cls.id)}
                          onChange={() => toggleClass(cls.id)}
                        />
                        {cls.name}
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                From date <span className="text-red-500">*</span>
              </span>
              <input
                type="date"
                className={INPUT}
                value={form.start_date}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                    end_date: prev.end_date || e.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                To date <span className="text-red-500">*</span>
              </span>
              <input
                type="date"
                className={INPUT}
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Remark <span className="text-red-500">*</span>
            </span>
            <textarea
              rows={3}
              className={INPUT}
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
              placeholder="e.g. Diwali, Summer Vacation, Class picnic"
              required
            />
          </label>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : holiday ? 'Save changes' : 'Add holiday'}
            </button>
          </div>
        </form>
      </div>
    </AppModal>
  );
}
