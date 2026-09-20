'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus, FiPrinter, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import StudentPickSelect, { STUDENT_OPS_INPUT } from '@/features/students/components/StudentPickSelect';
import IssuedCertificateDocument, {
  issuedCertificateHtml,
  type IssuedCertificateRecord,
} from '@/features/students/components/IssuedCertificateDocument';
import { printHtmlDocument } from '@/features/students/utils/print-html';
import { useDialog } from '@/shared/context/DialogContext';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useSettings } from '@/shared/SettingsContext';
import {
  CERTIFICATE_TYPE_LABELS,
  CERTIFICATE_TYPES,
  type IssuedCertificateType,
} from '@/lib/student-operations-utils';

interface ActivityRow {
  id: number;
  title: string;
  category?: string | null;
  award?: string | null;
  activity_date: string;
  first_name: string;
  last_name: string;
  admission_number: string;
}

export default function CertificatesPage() {
  const { confirm, alert } = useDialog();
  const { settings } = useSettings();
  const { selectedAcademicYear } = useEnrollmentSession();
  const [tab, setTab] = useState<'issue' | 'register' | 'activities'>('issue');
  const [type, setType] = useState<IssuedCertificateType>('dob');
  const [studentId, setStudentId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [records, setRecords] = useState<IssuedCertificateRecord & { id: number }[]>([]);
  const [preview, setPreview] = useState<(IssuedCertificateRecord & { id: number }) | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [activityForm, setActivityForm] = useState({
    student_id: '',
    title: '',
    category: '',
    award: '',
    activity_date: new Date().toISOString().split('T')[0],
  });

  const schoolSnapshot = useMemo(
    () => ({
      name: settings.school_name,
      address: settings.school_address,
    }),
    [settings]
  );

  const loadRegister = useCallback(async () => {
    const params = new URLSearchParams({ type });
    if (selectedAcademicYear?.name) params.set('academic_year', selectedAcademicYear.name);
    const res = await fetch(`/api/students/issued-certificates?${params}`);
    const data = await res.json();
    if (data.success) setRecords(data.data || []);
  }, [type, selectedAcademicYear?.name]);

  const loadActivities = useCallback(async () => {
    const res = await fetch('/api/students/activities');
    const data = await res.json();
    if (data.success) setActivities(data.data || []);
  }, []);

  useEffect(() => {
    void loadRegister();
  }, [loadRegister]);

  useEffect(() => {
    if (tab === 'activities') void loadActivities();
  }, [tab, loadActivities]);

  const issue = async () => {
    if (!studentId) {
      await alert('Select a student');
      return;
    }
    const res = await fetch('/api/students/issued-certificates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        certificate_type: type,
        student_id: Number(studentId),
        purpose,
        academic_year: selectedAcademicYear?.name,
        school_snapshot: schoolSnapshot,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to issue');
      return;
    }
    setPreview(data.data);
    setStudentId('');
    setPurpose('');
    loadRegister();
  };

  const removeCert = async (id: number) => {
    const ok = await confirm('Delete this certificate from the register?', { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    await fetch(`/api/students/issued-certificates/${id}`, { method: 'DELETE' });
    loadRegister();
  };

  const saveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/students/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...activityForm, academic_year: selectedAcademicYear?.name }),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to save activity');
      return;
    }
    setActivityForm({ ...activityForm, title: '', award: '' });
    loadActivities();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-lg font-medium text-gray-900">Certificates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Issue Date of Birth, Character, and Study certificates. Transfer certificates stay under TC.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ['issue', 'Issue'],
            ['register', 'Register'],
            ['activities', 'Activities'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id as typeof tab)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                tab === id ? 'bg-primary-600 text-white' : 'border bg-white text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {(tab === 'issue' || tab === 'register') && (
          <div className="mb-4">
            <select
              className={`${STUDENT_OPS_INPUT} max-w-xs`}
              value={type}
              onChange={(e) => setType(e.target.value as IssuedCertificateType)}
            >
              {CERTIFICATE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {CERTIFICATE_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        )}

        {tab === 'issue' && (
          <div className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6">
            <StudentPickSelect value={studentId} onChange={setStudentId} />
            <label className="block text-sm">
              Purpose
              <input className={`${STUDENT_OPS_INPUT} mt-1`} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </label>
            <button type="button" onClick={issue} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white">
              <FiPlus /> Issue certificate
            </button>
          </div>
        )}

        {tab === 'register' && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Number</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Issued</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-2.5 font-mono text-xs">{row.certificate_number}</td>
                    <td className="px-4 py-2.5">{row.student_snapshot?.full_name}</td>
                    <td className="px-4 py-2.5">{row.issue_date?.slice(0, 10)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        className="mr-2 rounded p-1.5 hover:bg-gray-100"
                        onClick={() => printHtmlDocument(row.certificate_number, issuedCertificateHtml(row))}
                      >
                        <FiPrinter />
                      </button>
                      <button type="button" className="rounded p-1.5 text-red-600 hover:bg-red-50" onClick={() => removeCert(row.id)}>
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                      No certificates in this register.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'activities' && (
          <div className="space-y-4">
            <form onSubmit={saveActivity} className="grid grid-cols-1 gap-3 rounded-xl border bg-white p-4 md:grid-cols-5">
              <div className="md:col-span-2">
                <StudentPickSelect
                  value={activityForm.student_id}
                  onChange={(student_id) => setActivityForm({ ...activityForm, student_id })}
                />
              </div>
              <input
                required
                placeholder="Activity title"
                className={STUDENT_OPS_INPUT}
                value={activityForm.title}
                onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
              />
              <input
                placeholder="Award"
                className={STUDENT_OPS_INPUT}
                value={activityForm.award}
                onChange={(e) => setActivityForm({ ...activityForm, award: e.target.value })}
              />
              <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white">
                Add
              </button>
            </form>
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Activity</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Award</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-2.5">{row.activity_date?.slice(0, 10)}</td>
                      <td className="px-4 py-2.5">
                        {row.first_name} {row.last_name}
                      </td>
                      <td className="px-4 py-2.5">{row.title}</td>
                      <td className="px-4 py-2.5">{row.award || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AppModal open={preview != null} onClose={() => setPreview(null)}>
        <div className={APP_MODAL_PANEL}>
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-medium">Certificate issued</h2>
            {preview && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                onClick={() => printHtmlDocument(preview.certificate_number, issuedCertificateHtml(preview))}
              >
                <FiPrinter /> Print
              </button>
            )}
          </div>
          <div className="overflow-y-auto p-6">{preview && <IssuedCertificateDocument record={preview} />}</div>
        </div>
      </AppModal>
    </DashboardLayout>
  );
}
