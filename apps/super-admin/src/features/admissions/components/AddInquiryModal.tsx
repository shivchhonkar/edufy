'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import type { InquiryStatus } from '@/lib/admission-inquiry-api';
import { STATUS_LABELS } from '@/features/admissions/utils/inquiry-labels';

interface Class {
  id: number;
  name: string;
}

interface AddInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classes: Class[];
  defaultStatus?: InquiryStatus;
}

const emptyForm = {
  student_first_name: '',
  student_last_name: '',
  date_of_birth: '',
  gender: '',
  parent_relation: 'father' as 'father' | 'mother',
  parent_name: '',
  parent_phone: '',
  parent_email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  interested_class_id: '',
  academic_year: '',
  source: 'walk_in',
  priority: 'normal',
  follow_up_date: '',
  remarks: '',
};

export default function AddInquiryModal({
  isOpen,
  onClose,
  onSuccess,
  classes,
  defaultStatus = 'new',
}: AddInquiryModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setError('');
    }
  }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admissions/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          interested_class_id: form.interested_class_id
            ? parseInt(form.interested_class_id, 10)
            : null,
          gender: form.gender || null,
          status: defaultStatus,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to create inquiry');
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError('Failed to create inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500';

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div className={APP_MODAL_PANEL}>
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 flex justify-between items-center z-10 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl text-gray-900">New Admission Inquiry</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Capture student and parent details
              {defaultStatus !== 'new' && (
                <span className="ml-1 text-primary-600">
                  · Starts in {STATUS_LABELS[defaultStatus]}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form id="inquiry-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Student Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student first name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.student_first_name}
                    onChange={(e) => setForm({ ...form, student_first_name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student last name
                  </label>
                  <input
                    value={form.student_last_name}
                    onChange={(e) => setForm({ ...form, student_last_name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interested class
                  </label>
                  <select
                    value={form.interested_class_id}
                    onChange={(e) => setForm({ ...form, interested_class_id: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Parent / Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relation with student <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.parent_relation}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        parent_relation: e.target.value as 'father' | 'mother',
                      })
                    }
                    className={inputClass}
                  >
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.parent_relation === 'mother' ? 'Mother' : 'Father'} name{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.parent_name}
                    onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.parent_relation === 'mother' ? 'Mother' : 'Father'} phone{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.parent_phone}
                    onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.parent_relation === 'mother' ? 'Mother' : 'Father'} email
                  </label>
                  <input
                    type="email"
                    value={form.parent_email}
                    onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Inquiry Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className={inputClass}
                  >
                    <option value="walk_in">Walk-in</option>
                    <option value="phone">Phone</option>
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="social_media">Social Media</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className={inputClass}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up date</label>
                  <input
                    type="date"
                    value={form.follow_up_date}
                    onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  rows={4}
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className={inputClass}
                  placeholder="Notes from the inquiry conversation..."
                />
              </div>
            </section>
          </form>
        </div>

        <div className="sticky bottom-0 bg-white border-t pt-4 pb-2 px-4 sm:px-6 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="inquiry-form"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving...' : 'Create Inquiry'}
          </button>
        </div>
      </div>
    </AppModal>
  );
}
