'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import StudentPickSelect, { STUDENT_OPS_INPUT } from '@/features/students/components/StudentPickSelect';
import AppModal, { AppModalShell } from '@/shared/components/common/AppModal';
import { useDialog } from '@/shared/context/DialogContext';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import {
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPES,
  type InteractionType,
} from '@/lib/student-operations-utils';

export interface InteractionRow {
  id: number;
  interaction_type: InteractionType;
  student_name?: string | null;
  interaction_date: string;
  subject: string;
  description?: string | null;
  follow_up_date?: string | null;
  status: 'open' | 'closed';
  created_by_name?: string | null;
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

interface StudentInteractionsPanelProps {
  lockedType?: InteractionType | '';
  showTypeFilter?: boolean;
  reportMode?: boolean;
}

export default function StudentInteractionsPanel({
  lockedType = '',
  showTypeFilter = true,
  reportMode = false,
}: StudentInteractionsPanelProps) {
  const { confirm, alert } = useDialog();
  const { selectedAcademicYear } = useEnrollmentSession();
  const [rows, setRows] = useState<InteractionRow[]>([]);
  const [type, setType] = useState<string>(lockedType);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const blankForm = useCallback(
    () => ({
      interaction_type: (lockedType || 'query') as InteractionType,
      student_id: '',
      subject: '',
      description: '',
      interaction_date: todayInputDate(),
      follow_up_date: '',
    }),
    [lockedType],
  );
  const [form, setForm] = useState(blankForm);

  useEffect(() => {
    setType(lockedType || '');
    if (lockedType) {
      setForm((prev) => ({ ...prev, interaction_type: lockedType }));
    }
  }, [lockedType]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    const res = await fetch(`/api/students/interactions?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, [type, status, search, fromDate, toDate]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const openCreate = () => {
    setForm(blankForm());
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/students/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, academic_year: selectedAcademicYear?.name }),
      });
      const data = await res.json();
      if (!data.success) {
        await alert(data.error || 'Failed to save');
        return;
      }
      setForm(blankForm());
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const closeRow = async (row: InteractionRow) => {
    await fetch(`/api/students/interactions/${row.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: row.status === 'open' ? 'closed' : 'open' }),
    });
    load();
  };

  const remove = async (row: InteractionRow) => {
    const ok = await confirm('Delete this record?', { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    await fetch(`/api/students/interactions/${row.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {showTypeFilter && !lockedType && (
          <select
            className="w-44 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All types</option>
            {INTERACTION_TYPES.map((value) => (
              <option key={value} value={value}>
                {INTERACTION_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        )}
        <select
          className="w-40 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <input
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subject or student"
        />
        <input
          type="date"
          className="w-40 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <input
          type="date"
          className="w-40 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
        {!reportMode && (
          <button type="button" onClick={openCreate} className={`${primaryButtonClass} shrink-0`}>
            <FiPlus size={14} />
            {lockedType ? `New ${INTERACTION_TYPE_LABELS[lockedType]}` : 'New record'}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              {!reportMode && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-2.5">{row.interaction_date?.slice(0, 10)}</td>
                <td className="px-4 py-2.5">{INTERACTION_TYPE_LABELS[row.interaction_type]}</td>
                <td className="px-4 py-2.5">{row.student_name || '—'}</td>
                <td className="px-4 py-2.5">
                  {row.subject}
                  {row.description && <div className="text-xs text-gray-500">{row.description}</div>}
                </td>
                <td className="px-4 py-2.5 capitalize">{row.status}</td>
                {!reportMode && (
                  <td className="px-4 py-2.5 text-right">
                    <button type="button" className="mr-2 text-sm text-primary-700" onClick={() => closeRow(row)}>
                      {row.status === 'open' ? 'Close' : 'Reopen'}
                    </button>
                    <button type="button" className="rounded p-1.5 text-red-600 hover:bg-red-50" onClick={() => remove(row)}>
                      <FiTrash2 />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AppModal open={modalOpen} onClose={closeModal}>
        <AppModalShell
          header={
            <>
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {lockedType ? `New ${INTERACTION_TYPE_LABELS[lockedType]}` : 'New record'}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Save a query, call, meeting, or counselling note for a student.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </>
          }
          footer={
            <>
              <button type="button" onClick={closeModal} className={quietButtonClass}>
                Cancel
              </button>
              <button type="submit" form="interaction-form" disabled={saving} className={primaryButtonClass}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <form id="interaction-form" onSubmit={save} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            {!lockedType && (
              <label className="text-xs font-medium text-gray-700 md:col-span-2">
                Type
                <select
                  className={`${STUDENT_OPS_INPUT} mt-1`}
                  value={form.interaction_type}
                  onChange={(e) => setForm({ ...form, interaction_type: e.target.value as InteractionType })}
                >
                  {INTERACTION_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {INTERACTION_TYPE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs font-medium text-gray-700 md:col-span-2">
              Student
              <div className="mt-1">
                <StudentPickSelect value={form.student_id} onChange={(student_id) => setForm({ ...form, student_id })} />
              </div>
            </label>
            <label className="text-xs font-medium text-gray-700">
              Subject
              <input
                required
                placeholder="Subject"
                className={`${STUDENT_OPS_INPUT} mt-1`}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Date
              <input
                type="date"
                required
                className={`${STUDENT_OPS_INPUT} mt-1`}
                value={form.interaction_date}
                onChange={(e) => setForm({ ...form, interaction_date: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-gray-700 md:col-span-2">
              Notes
              <textarea
                placeholder="Optional details"
                className={`${STUDENT_OPS_INPUT} mt-1`}
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
          </form>
        </AppModalShell>
      </AppModal>
    </div>
  );
}
