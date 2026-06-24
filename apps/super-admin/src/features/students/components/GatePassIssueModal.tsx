'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useEffect, useMemo, useRef, useState } from 'react';
import CollectorCameraModal from '@/features/students/components/CollectorCameraModal';
import GatePassDocument, {
  type GatePassDocumentData,
  type GatePassSchoolInfo,
} from '@/features/students/components/GatePassDocument';
import { buildGatePassSchoolInfo } from '@/features/students/utils/gate-pass-school-info';
import { GATE_PASS_APPROVER_ROLES } from '@/lib/gate-pass-utils';
import { getClientUser, getClientToken } from '@/lib/client-auth';
import { getUserFromToken, hasRole } from '@/lib/auth';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import type { Student } from '@/shared/types';
import { studentFullName } from '@/features/students/utils/student-profile';
import { FiCamera, FiCheckCircle, FiShield, FiUser, FiX } from 'react-icons/fi';

const COLLECTOR_RELATIONSHIPS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'relative', label: 'Relative' },
  { value: 'other', label: 'Other' },
];

interface GuardianContact {
  label: string;
  name: string;
  mobile: string;
  source: string;
}

interface GatePassRecord extends GatePassDocumentData {
  id: number;
  student_id: number;
}

interface GatePassIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  school?: GatePassSchoolInfo;
}

function readGatePassAdminAccess(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = getClientUser();
  const tokenUser = getUserFromToken(getClientToken() || '');
  const role = String(stored?.role || tokenUser?.role || '');
  return hasRole(role, [...GATE_PASS_APPROVER_ROLES]);
}

export default function GatePassIssueModal({
  isOpen,
  onClose,
  student,
  school: schoolProp,
}: GatePassIssueModalProps) {
  const { alert, confirm } = useDialog();
  const { settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [canStaffApprove, setCanStaffApprove] = useState(false);
  const [reportSettings, setReportSettings] = useState<{ logo_url?: string }>({});
  const [guardianContacts, setGuardianContacts] = useState<GuardianContact[]>([]);
  const [selectedGuardianMobile, setSelectedGuardianMobile] = useState('');
  const [collectorName, setCollectorName] = useState('');
  const [collectorMobile, setCollectorMobile] = useState('');
  const [collectorRelationship, setCollectorRelationship] = useState('guardian');
  const [collectorPhotoUrl, setCollectorPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [reason, setReason] = useState('');
  const [pendingPass, setPendingPass] = useState<GatePassRecord | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [staffApproving, setStaffApproving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const schoolInfo = useMemo(
    () => schoolProp ?? buildGatePassSchoolInfo(settings, reportSettings),
    [schoolProp, settings, reportSettings],
  );

  useEffect(() => {
    if (schoolProp || !isOpen) return;
    fetch('/api/settings/reports')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setReportSettings(d.data);
      })
      .catch(console.error);
  }, [isOpen, schoolProp]);

  const resetForm = () => {
    setPendingPass(null);
    setOtpCode('');
    setCollectorName('');
    setCollectorMobile('');
    setCollectorRelationship('guardian');
    setCollectorPhotoUrl('');
    setReason('');
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }
    setCanStaffApprove(readGatePassAdminAccess());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !student?.id) {
      setGuardianContacts([]);
      setSelectedGuardianMobile('');
      return;
    }
    fetch(`/api/students/gate-passes/guardian-contacts?student_id=${student.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setGuardianContacts(json.data);
          setSelectedGuardianMobile(json.data[0]?.mobile || '');
        }
      })
      .catch(console.error);
  }, [isOpen, student?.id]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePhotoUpload = async (file: File) => {
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload?folder=gate-pass', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        setCollectorPhotoUrl(json.data.url);
        setShowCameraModal(false);
      } else {
        await alert(json.error || 'Photo upload failed', { title: 'Upload error', type: 'error' });
      }
    } catch {
      await alert('Photo upload failed', { title: 'Error', type: 'error' });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleCreatePass = async () => {
    if (!student) return;
    if (!collectorName.trim() || !collectorMobile.trim() || !reason.trim()) {
      await alert('Collector name, mobile, and reason are required.', {
        title: 'Missing fields',
        type: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/students/gate-passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
          collector_name: collectorName.trim(),
          collector_mobile: collectorMobile.trim(),
          collector_relationship: collectorRelationship,
          collector_photo_url: collectorPhotoUrl || null,
          reason: reason.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPendingPass(json.data);
        await alert(`Gate pass ${json.data.pass_number} created. Complete OTP or staff approval.`, {
          title: 'Gate pass created',
          type: 'success',
        });
      } else {
        await alert(json.error || 'Failed to create gate pass', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to create gate pass', { title: 'Error', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (!pendingPass || !selectedGuardianMobile) {
      await alert('Select a registered parent/guardian mobile for OTP.', {
        title: 'Guardian mobile required',
        type: 'warning',
      });
      return;
    }
    setOtpSending(true);
    try {
      const res = await fetch(`/api/students/gate-passes/${pendingPass.id}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardian_mobile: selectedGuardianMobile }),
      });
      const json = await res.json();
      if (json.success) {
        await alert(json.data.message, { title: 'OTP sent', type: 'success' });
      } else {
        await alert(json.error || 'Failed to send OTP', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to send OTP', { title: 'Error', type: 'error' });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!pendingPass || !otpCode.trim()) return;
    setOtpVerifying(true);
    try {
      const res = await fetch(`/api/students/gate-passes/${pendingPass.id}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        await alert('Gate pass approved. Student exit recorded.', {
          title: 'Approved',
          type: 'success',
        });
        handleClose();
      } else {
        await alert(json.error || 'Invalid OTP', { title: 'Verification failed', type: 'error' });
      }
    } catch {
      await alert('OTP verification failed', { title: 'Error', type: 'error' });
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleStaffApprove = async () => {
    if (!pendingPass) return;
    const confirmed = await confirm(
      'Parent/guardian could not be reached. Approve this gate pass as authorized school staff?',
      { title: 'Staff approval', type: 'warning', confirmText: 'Approve' },
    );
    if (!confirmed) return;

    setStaffApproving(true);
    try {
      const res = await fetch(`/api/students/gate-passes/${pendingPass.id}/staff-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        await alert('Gate pass approved by school authority. Student exit recorded.', {
          title: 'Approved',
          type: 'success',
        });
        handleClose();
      } else {
        await alert(json.error || 'Approval failed', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Approval failed', { title: 'Error', type: 'error' });
    } finally {
      setStaffApproving(false);
    }
  };

  if (!student) return null;

  return (
    <>
      <AppModal open={isOpen} onClose={handleClose}>
        <div className={APP_MODAL_PANEL}>
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FiShield className="text-primary-600" />
                Gate Pass
              </h2>
              <p className="text-sm text-gray-500">
                {studentFullName(student)} · {student.admission_number}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!pendingPass ? (
              <>
                <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-800">
                  Issue an early exit gate pass for{' '}
                  <strong>{studentFullName(student)}</strong>
                  {student.class_name ? ` (${student.class_name})` : ''}.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block text-sm">
                    <span className="text-gray-700">Collector name *</span>
                    <input
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                      value={collectorName}
                      onChange={(e) => setCollectorName(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-700">Collector mobile *</span>
                    <input
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                      value={collectorMobile}
                      onChange={(e) => setCollectorMobile(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-700">Relationship *</span>
                    <select
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
                      value={collectorRelationship}
                      onChange={(e) => setCollectorRelationship(e.target.value)}
                    >
                      {COLLECTOR_RELATIONSHIPS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm md:col-span-2">
                    <span className="text-gray-700">Reason for early departure *</span>
                    <textarea
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Medical appointment, family emergency..."
                    />
                  </label>
                </div>

                <div>
                  <p className="text-sm text-gray-700 mb-2">Collector photo</p>
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
                    {collectorPhotoUrl && (
                      <img
                        src={collectorPhotoUrl}
                        alt="Collector"
                        className="h-20 w-20 shrink-0 rounded-lg object-cover border border-gray-200"
                      />
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <button
                    type="button"
                    onClick={handleCreatePass}
                    disabled={submitting}
                    className="inline-flex h-10 items-center bg-primary-600 text-white px-5 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40"
                  >
                    {submitting ? 'Creating...' : 'Create Gate Pass & Authorize'}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <GatePassDocument
                  record={{
                    ...pendingPass,
                    collector_photo_url: pendingPass.collector_photo_url || collectorPhotoUrl || null,
                  }}
                  school={schoolInfo}
                />

                <div className="bg-white border rounded-lg p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Authorization required</h3>
                  <p className="text-sm text-gray-500">
                    Complete OTP verification or staff approval to record exit time.
                  </p>

                  <div className="border rounded-lg p-4 space-y-3 bg-blue-50/50">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FiUser size={16} /> Parent / Guardian OTP
                    </h4>
                    {guardianContacts.length === 0 ? (
                      <p className="text-sm text-amber-700">
                        No registered guardian mobile found. Use staff approval below.
                      </p>
                    ) : (
                      <>
                        <label className="block text-sm">
                          <span className="text-gray-700">Send OTP to registered mobile</span>
                          <select
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
                            value={selectedGuardianMobile}
                            onChange={(e) => setSelectedGuardianMobile(e.target.value)}
                          >
                            {guardianContacts.map((c) => (
                              <option key={c.mobile} value={c.mobile}>
                                {c.label} — {c.mobile}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpSending}
                          className="border bg-white px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                          {otpSending ? 'Sending OTP...' : 'Send OTP via SMS (2factor)'}
                        </button>
                        <div className="flex flex-wrap gap-2 items-end">
                          <label className="text-sm flex-1 min-w-[140px]">
                            <span className="text-gray-700">Enter OTP</span>
                            <input
                              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm tracking-widest"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              maxLength={6}
                              inputMode="numeric"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={otpVerifying || !otpCode.trim()}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-40 flex items-center gap-2"
                          >
                            <FiCheckCircle size={16} />
                            {otpVerifying ? 'Verifying...' : 'Verify & Record Exit'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {canStaffApprove && (
                    <div className="border rounded-lg p-4 space-y-2 bg-amber-50/50">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Principal / Authorized staff
                      </h4>
                      <p className="text-xs text-gray-600">
                        Use only when parent/guardian cannot be reached.
                      </p>
                      <button
                        type="button"
                        onClick={handleStaffApprove}
                        disabled={staffApproving}
                        className="border border-amber-300 bg-white px-4 py-2 rounded-lg text-sm hover:bg-amber-50 disabled:opacity-50"
                      >
                        {staffApproving ? 'Approving...' : 'Approve without OTP (Staff)'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppModal>

      <CollectorCameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handlePhotoUpload}
      />
    </>
  );
}
