'use client';

import AppModal from '@/shared/components/common/AppModal';
import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import StaffSearchField, { type StaffSearchOption } from '@/features/visitors/components/StaffSearchField';
import {
  VISITOR_ID_PROOF_LABELS,
  VISITOR_ID_PROOF_TYPES,
  type VisitorIdProofType,
} from '@/lib/visitor-utils';

interface RecordVisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  visitor_name: '',
  phone: '',
  email: '',
  purpose: '',
  person_to_meet: '',
  host_phone: '',
  department: '',
  id_proof_type: '' as VisitorIdProofType | '',
  id_proof_number: '',
  vehicle_number: '',
  notes: '',
  send_sms: true,
};

export default function RecordVisitorModal({ isOpen, onClose, onSuccess }: RecordVisitorModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [smsWarning, setSmsWarning] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setError('');
    setSmsWarning('');
  }, [isOpen]);

  const handleStaffSelect = (staff: StaffSearchOption) => {
    setForm((prev) => ({
      ...prev,
      person_to_meet: staff.name,
      host_phone: staff.phone || prev.host_phone,
      department: staff.department_name || prev.department,
    }));
  };

  const handlePersonToMeetChange = (name: string) => {
    setForm((prev) => ({ ...prev, person_to_meet: name }));
  };

  const updateField = (field: keyof typeof EMPTY_FORM, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSmsWarning('');

    if (!form.visitor_name.trim() || !form.phone.trim() || !form.purpose.trim() || !form.person_to_meet.trim()) {
      setError('Visitor name, phone, purpose, and person to meet are required.');
      return;
    }

    if (form.send_sms && !form.host_phone.trim()) {
      setError('Host mobile is required when SMS notification is enabled.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          id_proof_type: form.id_proof_type || null,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to register visitor');
        return;
      }

      if (result.sms && !result.sms.success && !result.sms.skipped) {
        setSmsWarning(result.sms.error || 'Visitor saved but SMS could not be sent.');
        onSuccess();
        onClose();
        return;
      }

      if (result.sms?.skipped) {
        setSmsWarning('Visitor registered. SMS was skipped (not configured or no host mobile).');
        onSuccess();
        onClose();
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError('Failed to register visitor. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal open={isOpen} onClose={onClose}>
      <div
        className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-visitor-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 id="record-visitor-title" className="text-lg font-medium text-gray-900">
            Register Visitor
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {smsWarning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {smsWarning}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visitor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.visitor_name}
                  onChange={(e) => updateField('visitor_name', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Full name"
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="10-digit mobile"
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="optional@email.com"
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Accounts"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose of Visit <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.purpose}
                  onChange={(e) => updateField('purpose', e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Reason for visit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Person to Meet <span className="text-red-500">*</span>
                </label>
                <StaffSearchField
                  value={form.person_to_meet}
                  onChange={handlePersonToMeetChange}
                  onSelect={handleStaffSelect}
                  required
                  placeholder="Search staff by name, ID, or phone..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Select from staff list or type a name manually.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Host Mobile (SMS)
                </label>
                <input
                  type="tel"
                  value={form.host_phone}
                  onChange={(e) => updateField('host_phone', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Notify this number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Proof Type</label>
                <select
                  value={form.id_proof_type}
                  onChange={(e) => updateField('id_proof_type', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select</option>
                  {VISITOR_ID_PROOF_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {VISITOR_ID_PROOF_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Proof Number</label>
                <input
                  type="text"
                  value={form.id_proof_number}
                  onChange={(e) => updateField('id_proof_number', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={form.vehicle_number}
                  onChange={(e) => updateField('vehicle_number', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-200 px-6 py-4 bg-gray-50/80">
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.send_sms}
                  onChange={(e) => updateField('send_sms', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Send text notification to host on check-in
              </label>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Check In Visitor'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppModal>
  );
}
