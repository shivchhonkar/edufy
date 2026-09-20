'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiEdit2, FiPlus, FiTrash2, FiUserPlus } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { STUDENT_OPS_INPUT } from '@/features/students/components/StudentPickSelect';
import AddRegistrationModal, {
  type RegistrationRecord,
} from '@/features/students/components/AddRegistrationModal';

interface Registration extends RegistrationRecord {
  student_last_name?: string | null;
  parent_name: string;
  parent_phone: string;
  class_id?: number | null;
  class_name?: string | null;
  registration_date: string;
  status: 'active' | 'admitted' | 'cancelled';
}

export default function RegistrationPage() {
  const { confirm, alert } = useDialog();
  const { selectedAcademicYear } = useEnrollmentSession();
  const [rows, setRows] = useState<Registration[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Registration | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const res = await fetch(`/api/students/registrations?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    fetch('/api/classes?active_only=true')
      .then((r) => r.json())
      .then((d) => d.success && setClasses(d.data || []));
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: Registration) => {
    setEditing(row);
    setModalOpen(true);
  };

  const remove = async (row: Registration) => {
    const ok = await confirm(`Delete registration ${row.registration_number}?`, {
      title: 'Delete Registration',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!ok) return;
    const res = await fetch(`/api/students/registrations/${row.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to delete');
      return;
    }
    load();
  };

  const admit = async (row: Registration) => {
    const ok = await confirm(`Admit ${row.student_first_name} and create a student record?`, {
      title: 'Admit Registration',
      confirmText: 'Admit',
    });
    if (!ok) return;
    const res = await fetch(`/api/students/registrations/${row.id}/admit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to admit');
      return;
    }
    load();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Registration</h1>
            <p className="mt-1 text-sm text-gray-500">
              Add, modify, delete, and list registrations before admission.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <FiPlus />
            Add Registration
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, registration no."
            className={`${STUDENT_OPS_INPUT} max-w-sm`}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${STUDENT_OPS_INPUT} w-40`}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="admitted">Admitted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Reg. No.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Parent</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Class</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    No registrations found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-2.5 font-mono text-xs">{row.registration_number}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {[row.student_first_name, row.student_last_name].filter(Boolean).join(' ')}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.parent_name}
                      <div className="text-xs text-gray-500">{row.parent_phone}</div>
                    </td>
                    <td className="px-4 py-2.5">{row.class_name || '—'}</td>
                    <td className="px-4 py-2.5">{row.registration_date?.slice(0, 10)}</td>
                    <td className="px-4 py-2.5 capitalize">{row.status}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        {row.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => admit(row)}
                            className="rounded p-1.5 text-primary-700 hover:bg-primary-50"
                            title="Admit"
                          >
                            <FiUserPlus />
                          </button>
                        )}
                        <button type="button" onClick={() => openEdit(row)} className="rounded p-1.5 hover:bg-gray-100">
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(row)}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddRegistrationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
        classes={classes}
        editing={editing}
        defaultAcademicYear={selectedAcademicYear?.name || ''}
      />
    </DashboardLayout>
  );
}
