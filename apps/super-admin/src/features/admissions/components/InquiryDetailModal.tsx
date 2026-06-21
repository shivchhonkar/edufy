'use client';

import AppModal from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import { FiX, FiUserPlus, FiTrash2 } from 'react-icons/fi';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import type { InquiryStatus } from '@/lib/admission-inquiry-api';
import {
  SOURCE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  inquiryStudentName,
} from '@/features/admissions/utils/inquiry-labels';

interface Class {
  id: number;
  name: string;
}

interface Activity {
  id: number;
  activity_type: string;
  description: string;
  old_status?: string | null;
  new_status?: string | null;
  created_at: string;
}

export interface Inquiry {
  id: number;
  inquiry_number: string;
  student_first_name: string;
  student_last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  address: string | null;
  city: string | null;
  interested_class_id: number | null;
  interested_class_name?: string | null;
  enrolled_class_id?: number | null;
  enrolled_class_name?: string | null;
  source: string;
  status: InquiryStatus;
  priority: string;
  follow_up_date: string | null;
  remarks: string | null;
  converted_student_id: number | null;
  created_at: string;
  updated_at: string;
}

interface InquiryDetailModalProps {
  inquiryId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  classes: Class[];
}

export default function InquiryDetailModal({
  inquiryId,
  isOpen,
  onClose,
  onUpdated,
  classes,
}: InquiryDetailModalProps) {
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [savingNote, setSavingNote] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showConvert, setShowConvert] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!inquiryId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admissions/inquiries/${inquiryId}`);
      const data = await res.json();
      if (data.success) {
        setInquiry(data.data.inquiry);
        setActivities(data.data.activities);
      } else {
        setError(data.error || 'Failed to load inquiry');
      }
    } catch {
      setError('Failed to load inquiry');
    } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => {
    if (isOpen && inquiryId) {
      setInquiry(null);
      setActivities([]);
      setError('');
      fetchDetail();
      setNoteText('');
    }
  }, [isOpen, inquiryId, fetchDetail]);

  if (!inquiryId) return null;

  const updateField = async (field: string, value: unknown) => {
    if (!inquiry) return;
    try {
      const res = await fetch(`/api/admissions/inquiries/${inquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        setInquiry(data.data);
        onUpdated();
        fetchDetail();
      } else {
        setError(data.error || 'Update failed');
      }
    } catch {
      setError('Update failed');
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (!inquiry) return;
    if (newStatus === 'enrolled' && !inquiry.converted_student_id) {
      setShowConvert(true);
      return;
    }
    updateField('status', newStatus);
  };

  const addNote = async () => {
    if (!inquiry || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admissions/inquiries/${inquiry.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_type: noteType, description: noteText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNoteText('');
        fetchDetail();
        onUpdated();
      } else {
        setError(data.error || 'Failed to add note');
      }
    } catch {
      setError('Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleConvert = async () => {
    if (!inquiry) return;
    setConverting(true);
    setError('');
    try {
      const res = await fetch(`/api/admissions/inquiries/${inquiry.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        onUpdated();
        fetchDetail();
        setShowConvert(false);
      } else {
        setError(data.error || 'Conversion failed');
        setShowConvert(false);
      }
    } catch {
      setError('Conversion failed');
      setShowConvert(false);
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!inquiry) return;
    try {
      const res = await fetch(`/api/admissions/inquiries/${inquiry.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onUpdated();
        onClose();
      } else {
        setError(data.error || 'Delete failed');
      }
    } catch {
      setError('Delete failed');
    } finally {
      setShowDelete(false);
    }
  };

  const isEnrollmentComplete =
    inquiry?.status === 'enrolled' && !!inquiry.converted_student_id;

  const canConvert =
    inquiry && !inquiry.converted_student_id && inquiry.status !== 'lost';

  const enrolledWithoutStudent =
    inquiry?.status === 'enrolled' && !inquiry.converted_student_id;

  return (
    <>
      <AppModal open={isOpen} onClose={onClose}>
        <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {inquiry ? inquiry.inquiry_number : 'Inquiry'}
              </h2>
              {inquiry && (
                <p className="text-sm text-gray-500">{inquiryStudentName(inquiry)}</p>
              )}
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <FiX size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && <p className="text-sm text-gray-500">Loading...</p>}
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>
            )}

            {enrolledWithoutStudent && (
              <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded border border-amber-200">
                Marked as enrolled but no student record exists yet. Click{' '}
                <strong>Convert to Student</strong> to add them to the Students page.
              </div>
            )}

            {inquiry && (
              <>
                <div className="flex flex-wrap gap-2 items-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[inquiry.status]}`}
                  >
                    {STATUS_LABELS[inquiry.status]}
                  </span>
                  {inquiry.priority === 'high' && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      High priority
                    </span>
                  )}
                  {inquiry.converted_student_id && (
                    <span className="text-xs text-green-700">
                      Student ID: {inquiry.converted_student_id}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="text-gray-500 text-xs">Status</label>
                    <select
                      value={inquiry.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="w-full border rounded px-2 py-1.5 mt-0.5 disabled:bg-gray-100 disabled:text-gray-500"
                      disabled={isEnrollmentComplete}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {isEnrollmentComplete && (
                      <p className="text-xs text-gray-500 mt-1">
                        Status is locked after enrollment. Update the student record on the Students page.
                      </p>
                    )}
                    {!isEnrollmentComplete && !inquiry.converted_student_id && (
                      <p className="text-xs text-gray-500 mt-1">
                        Choose Enrolled to convert this inquiry into a student record.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs">Follow-up</label>
                    <input
                      type="date"
                      value={inquiry.follow_up_date?.split('T')[0] || ''}
                      onChange={(e) => updateField('follow_up_date', e.target.value || null)}
                      className="w-full border rounded px-2 py-1.5 mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs">Parent</label>
                    <p className="font-medium">{inquiry.parent_name}</p>
                    <p className="text-gray-600">{inquiry.parent_phone}</p>
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs">Source</label>
                    <p>{SOURCE_LABELS[inquiry.source as keyof typeof SOURCE_LABELS] || inquiry.source}</p>
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs">
                      {inquiry.converted_student_id ? 'Enrolled class' : 'Class interest'}
                    </label>
                    {inquiry.converted_student_id ? (
                      <p className="font-medium text-gray-900 mt-0.5">
                        {inquiry.enrolled_class_name || '—'}
                      </p>
                    ) : (
                      <select
                        value={inquiry.interested_class_id || ''}
                        onChange={(e) =>
                          updateField(
                            'interested_class_id',
                            e.target.value ? parseInt(e.target.value, 10) : null
                          )
                        }
                        className="w-full border rounded px-2 py-1.5 mt-0.5"
                      >
                        <option value="">None</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {inquiry.converted_student_id &&
                      inquiry.interested_class_name &&
                      inquiry.enrolled_class_name &&
                      inquiry.interested_class_name !== inquiry.enrolled_class_name && (
                        <p className="text-xs text-amber-700 mt-1">
                          Pipeline showed {inquiry.interested_class_name}; student is in{' '}
                          {inquiry.enrolled_class_name}. Edit class on the Students page.
                        </p>
                      )}
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs">Date of birth</label>
                    <input
                      type="date"
                      value={inquiry.date_of_birth?.split('T')[0] || ''}
                      onChange={(e) => updateField('date_of_birth', e.target.value || null)}
                      className="w-full border rounded px-2 py-1.5 mt-0.5"
                    />
                  </div>
                </div>

                {inquiry.remarks && (
                  <div className="text-sm">
                    <label className="text-gray-500 text-xs">Remarks</label>
                    <p className="mt-0.5 text-gray-700">{inquiry.remarks}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Activity log</h3>
                  <div className="flex gap-2 mb-3">
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="border rounded px-2 py-1.5 text-sm"
                    >
                      <option value="note">Note</option>
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="visit">Visit</option>
                      <option value="sms">SMS</option>
                    </select>
                    <input
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add follow-up note..."
                      className="flex-1 border rounded px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={addNote}
                      disabled={savingNote || !noteText.trim()}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {activities.map((a) => (
                      <li key={a.id} className="text-sm border-l-2 border-primary-200 pl-3 py-1">
                        <span className="text-xs text-gray-400 capitalize">{a.activity_type}</span>
                        <p className="text-gray-800">{a.description}</p>
                        <span className="text-xs text-gray-400">
                          {new Date(a.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                    {activities.length === 0 && (
                      <li className="text-sm text-gray-400">No activity yet</li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>

          {inquiry && (
            <div className="p-4 border-t flex gap-2">
              {canConvert && (
                <button
                  type="button"
                  onClick={() => setShowConvert(true)}
                  disabled={converting}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <FiUserPlus size={16} />
                  Convert to Student
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 ml-auto"
              >
                <FiTrash2 size={16} />
                Delete
              </button>
            </div>
          )}
        </div>
      </AppModal>

      <ConfirmDialog
        isOpen={showConvert}
        title="Convert to Student"
        message={
          !inquiry?.date_of_birth
            ? 'Add date of birth before converting.'
            : !inquiry.interested_class_id
              ? 'Select a class interest before converting.'
              : `Create a student record for ${inquiryStudentName(inquiry!)} in ${
                  inquiry.interested_class_name || 'the selected class'
                }? They will appear on the Students page and this inquiry will be marked as enrolled.`
        }
        confirmText={
          inquiry?.date_of_birth && inquiry?.interested_class_id ? 'Convert' : 'OK'
        }
        type="info"
        onConfirm={() => {
          if (inquiry?.date_of_birth && inquiry?.interested_class_id) handleConvert();
          else setShowConvert(false);
        }}
        onCancel={() => setShowConvert(false)}
      />

      <ConfirmDialog
        isOpen={showDelete}
        title="Delete Inquiry"
        message="This will permanently delete the inquiry and its activity log."
        confirmText="Delete"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
}
