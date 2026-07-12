'use client';

import AppModal, {
  APP_MODAL_PANEL_STRUCTURED,
  APP_MODAL_HEADER,
  APP_MODAL_BODY,
  APP_MODAL_FOOTER,
} from '@/shared/components/common/AppModal';
import CollectorCameraModal from '@/features/students/components/CollectorCameraModal';
import HostSearchField, { type HostSearchOption } from '@/features/visitors/components/StaffSearchField';
import {
  VISITOR_ID_PROOF_LABELS,
  VISITOR_ID_PROOF_TYPES,
  type VisitorIdProofType,
} from '@/lib/visitor-utils';
import { useEffect, useRef, useState } from 'react';
import { FiCamera, FiX } from 'react-icons/fi';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [smsWarning, setSmsWarning] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setPhotoUrl('');
    setPhotoUploading(false);
    setShowCameraModal(false);
    setError('');
    setSmsWarning('');
  }, [isOpen]);

  const handleHostSelect = (option: HostSearchOption) => {
    setForm((prev) => ({
      ...prev,
      person_to_meet: option.name,
      host_phone: option.phone || prev.host_phone,
      department: option.department_name || prev.department,
    }));
  };

  const handlePersonToMeetChange = (name: string) => {
    setForm((prev) => ({ ...prev, person_to_meet: name }));
  };

  const updateField = (field: keyof typeof EMPTY_FORM, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (file: File) => {
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload?folder=visitors', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        setPhotoUrl(result.data.url);
        setShowCameraModal(false);
      } else {
        setError(result.error || 'Photo upload failed');
      }
    } catch {
      setError('Photo upload failed. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
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
          photo_url: photoUrl || null,
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
    <>
      <AppModal open={isOpen} onClose={onClose}>
        <div
          className={APP_MODAL_PANEL_STRUCTURED}
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-visitor-title"
        >
          <div className={APP_MODAL_HEADER}>
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

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className={`${APP_MODAL_BODY} px-6 py-5 space-y-4`}>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visitor Photo</label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCameraModal(true)}
                    disabled={photoUploading}
                    className="inline-flex h-10 items-center gap-2 bg-primary-600 text-white px-4 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                  >
                    <FiCamera size={16} />
                    Open camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoUploading}
                    className="inline-flex h-10 items-center border px-4 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {photoUploading ? 'Uploading...' : 'Upload from device'}
                  </button>
                  {photoUrl && (
                    <img
                      src={photoUrl}
                      alt="Visitor"
                      className="h-20 w-20 shrink-0 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">Optional. Capture or upload a visitor photo.</p>
              </div>

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
                  <HostSearchField
                    value={form.person_to_meet}
                    onChange={handlePersonToMeetChange}
                    onSelect={handleHostSelect}
                    required
                    placeholder="Search staff or student by name..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Search staff or students, or type a name manually.
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

            <div className={`${APP_MODAL_FOOTER} px-6 py-4 bg-gray-50/80`}>
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
                    disabled={submitting || photoUploading}
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

      <CollectorCameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handlePhotoUpload}
        uploading={photoUploading}
        title="Capture visitor photo"
      />
    </>
  );
}
