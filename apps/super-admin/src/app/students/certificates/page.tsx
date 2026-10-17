'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus, FiPrinter, FiTrash2, FiX } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AppModal, { AppModalShell } from '@/shared/components/common/AppModal';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';
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

function todayInputDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const primaryButtonClass =
  'inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs text-white hover:bg-primary-700 disabled:opacity-50';
const quietButtonClass =
  'inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50';

const tableHeadClass =
  'border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500';

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
  const [activityOpen, setActivityOpen] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({
    student_id: '',
    title: '',
    category: '',
    award: '',
    activity_date: todayInputDate(),
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
    setSavingActivity(true);
    try {
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
      setActivityForm({
        student_id: '',
        title: '',
        category: '',
        award: '',
        activity_date: todayInputDate(),
      });
      setActivityOpen(false);
      loadActivities();
    } finally {
      setSavingActivity(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Certificates</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Issue Date of Birth, Character, and Study certificates. Transfer certificates stay under TC.
            </p>
          </div>
          <div className={moduleTabBarClass}>
            {([
              ['issue', 'Issue'],
              ['register', 'Register'],
              ['activities', 'Activities'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={moduleTabClass(tab === id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'issue' && (
          <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Issue certificate</h2>
              <p className="mt-0.5 text-xs text-gray-500">Choose a type, then the student it is issued for.</p>
            </div>
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                {CERTIFICATE_TYPES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={`${moduleTabClass(type === value)} border border-gray-200 px-3 py-2 text-center`}
                  >
                    {CERTIFICATE_TYPE_LABELS[value]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-gray-700">
                  Student
                  <div className="mt-1">
                    <StudentPickSelect value={studentId} onChange={setStudentId} />
                  </div>
                </label>
                <label className="block text-xs font-medium text-gray-700">
                  Purpose
                  <input
                    className={`${STUDENT_OPS_INPUT} mt-1`}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Optional, for example school admission"
                  />
                </label>
              </div>
              <div className="flex justify-stretch sm:justify-end">
                <button type="button" onClick={issue} className={`${primaryButtonClass} w-full justify-center sm:w-auto`}>
                  <FiPlus size={14} />
                  Issue certificate
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'register' && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Register</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {records.length} {records.length === 1 ? 'certificate' : 'certificates'}
                </p>
              </div>
              <select
                className={`${STUDENT_OPS_INPUT} sm:w-56`}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableHeadClass}>
                    <th className="px-4 py-2.5 font-semibold">Number</th>
                    <th className="px-4 py-2.5 font-semibold">Student</th>
                    <th className="px-4 py-2.5 font-semibold">Issued</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{row.certificate_number}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{row.student_snapshot?.full_name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.issue_date?.slice(0, 10)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-primary-600"
                            aria-label="Print"
                            onClick={() => printHtmlDocument(row.certificate_number, issuedCertificateHtml(row))}
                          >
                            <FiPrinter size={15} />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete"
                            onClick={() => removeCert(row.id)}
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center">
                        <p className="text-sm font-medium text-gray-700">No certificates yet</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Issue a {CERTIFICATE_TYPE_LABELS[type]} to see it in this register.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'activities' && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Activities</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {activities.length} {activities.length === 1 ? 'record' : 'records'}
                </p>
              </div>
              <button type="button" onClick={() => setActivityOpen(true)} className={primaryButtonClass}>
                <FiPlus size={14} />
                New activity
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableHeadClass}>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Student</th>
                    <th className="px-4 py-2.5 font-semibold">Activity</th>
                    <th className="px-4 py-2.5 font-semibold">Award</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="px-4 py-2.5 text-gray-600">{row.activity_date?.slice(0, 10)}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {row.first_name} {row.last_name}
                        <div className="text-xs font-normal text-gray-500">{row.admission_number}</div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {row.title}
                        {row.category && <div className="text-xs text-gray-500">{row.category}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{row.award || '—'}</td>
                    </tr>
                  ))}
                  {activities.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center">
                        <p className="text-sm font-medium text-gray-700">No activities yet</p>
                        <p className="mt-1 text-xs text-gray-500">Add a student activity or award.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AppModal open={activityOpen} onClose={() => !savingActivity && setActivityOpen(false)}>
        <AppModalShell
          header={
            <>
              <div>
                <h2 className="text-lg font-medium text-gray-900">New activity</h2>
                <p className="mt-0.5 text-xs text-gray-500">Record a student activity or award.</p>
              </div>
              <button
                type="button"
                onClick={() => setActivityOpen(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </>
          }
          footer={
            <>
              <button type="button" onClick={() => setActivityOpen(false)} className={quietButtonClass}>
                Cancel
              </button>
              <button type="submit" form="activity-form" disabled={savingActivity} className={primaryButtonClass}>
                {savingActivity ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <form id="activity-form" onSubmit={saveActivity} className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <label className="text-xs font-medium text-gray-700 sm:col-span-2">
              Student
              <div className="mt-1">
                <StudentPickSelect
                  value={activityForm.student_id}
                  onChange={(student_id) => setActivityForm({ ...activityForm, student_id })}
                />
              </div>
            </label>
            <label className="text-xs font-medium text-gray-700 sm:col-span-2">
              Activity
              <input
                required
                placeholder="Activity title"
                className={`${STUDENT_OPS_INPUT} mt-1`}
                value={activityForm.title}
                onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Category
              <input
                className={`${STUDENT_OPS_INPUT} mt-1`}
                value={activityForm.category}
                onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}
                placeholder="Sports, cultural, academic"
              />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Award
              <input
                className={`${STUDENT_OPS_INPUT} mt-1`}
                value={activityForm.award}
                onChange={(e) => setActivityForm({ ...activityForm, award: e.target.value })}
                placeholder="Optional"
              />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Date
              <input
                type="date"
                required
                className={`${STUDENT_OPS_INPUT} mt-1`}
                value={activityForm.activity_date}
                onChange={(e) => setActivityForm({ ...activityForm, activity_date: e.target.value })}
              />
            </label>
          </form>
        </AppModalShell>
      </AppModal>

      <AppModal open={preview != null} onClose={() => setPreview(null)}>
        <AppModalShell
          header={
            <>
              <div>
                <h2 className="text-lg font-medium text-gray-900">Certificate issued</h2>
                <p className="mt-0.5 text-xs text-gray-500">{preview?.certificate_number}</p>
              </div>
              <div className="flex items-center gap-2">
                {preview && (
                  <button
                    type="button"
                    className={quietButtonClass}
                    onClick={() => printHtmlDocument(preview.certificate_number, issuedCertificateHtml(preview))}
                  >
                    <FiPrinter size={14} />
                    Print
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                  aria-label="Close"
                >
                  <FiX size={18} />
                </button>
              </div>
            </>
          }
        >
          <div className="p-6">{preview && <IssuedCertificateDocument record={preview} />}</div>
        </AppModalShell>
      </AppModal>
    </DashboardLayout>
  );
}
