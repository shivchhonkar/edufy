'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiEdit2, FiPlus, FiSearch, FiTrash2, FiUserPlus } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
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
  converted_student_id?: number | null;
}

const STATUS_STYLE: Record<Registration['status'], string> = {
  active: 'bg-sky-50 text-sky-700',
  admitted: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const inputClass =
  'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none';

function studentName(row: Registration) {
  return [row.student_first_name, row.student_last_name].filter(Boolean).join(' ');
}

export default function RegistrationPage() {
  const { confirm, alert } = useDialog();
  const { selectedAcademicYear } = useEnrollmentSession();
  const [rows, setRows] = useState<Registration[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [classId, setClassId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Registration | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (classId) params.set('class_id', classId);
    const res = await fetch(`/api/students/registrations?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
    setLoading(false);
  }, [search, status, classId]);

  useEffect(() => {
    fetch('/api/classes?active_only=true')
      .then((r) => r.json())
      .then((d) => d.success && setClasses(d.data || []));
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const counts = useMemo(() => {
    return {
      all: rows.length,
      active: rows.filter((row) => row.status === 'active').length,
      admitted: rows.filter((row) => row.status === 'admitted').length,
    };
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: Registration) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleSaved = async (result?: { admitted?: boolean; admissionNumber?: string }) => {
    await load();
    if (result?.admitted) {
      await alert(
        result.admissionNumber
          ? `Student admitted. Admission no. ${result.admissionNumber}`
          : 'Student admitted and added to the directory.',
        { title: 'Admitted', type: 'success' }
      );
    }
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
    if (!row.date_of_birth || !row.class_id) {
      await alert('Add class and date of birth before admitting this student.', {
        title: 'Missing details',
        type: 'warning',
      });
      openEdit(row);
      return;
    }
    const ok = await confirm(
      `Admit ${studentName(row)} and create a student record in the directory?`,
      { title: 'Admit student', confirmText: 'Admit' }
    );
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
    await load();
    const admissionNumber = data.data?.student?.admission_number;
    await alert(
      admissionNumber
        ? `${studentName(row)} is now enrolled. Admission no. ${admissionNumber}`
        : `${studentName(row)} is now enrolled in the student directory.`,
      { title: 'Admitted', type: 'success' }
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Registrations</h1>
            <p className="mt-1 text-sm text-gray-500">
              Register a new student, then admit them to the school directory when ready.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <FiPlus />
            Register student
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(
            [
              { value: '', label: 'All' },
              { value: 'active', label: 'Ready to admit' },
              { value: 'admitted', label: 'Admitted' },
              { value: 'cancelled', label: 'Cancelled' },
            ] as const
          ).map((item) => (
            <button
              key={item.value || 'all'}
              type="button"
              onClick={() => setStatus(item.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                status === item.value
                  ? 'bg-primary-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.label}
              {item.value === '' && !loading ? ` · ${counts.all}` : ''}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, mobile, or registration no."
              className={`${inputClass} w-full pl-9`}
            />
          </div>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className={`${inputClass} w-44`}
          >
            <option value="">All classes</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Reg. no.</th>
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
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-gray-500">No registrations yet.</p>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white"
                    >
                      <FiPlus />
                      Register student
                    </button>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-2.5 font-mono text-xs">{row.registration_number}</td>
                    <td className="px-4 py-2.5 font-medium">{studentName(row)}</td>
                    <td className="px-4 py-2.5">
                      {row.parent_name}
                      <div className="text-xs text-gray-500">{row.parent_phone}</div>
                    </td>
                    <td className="px-4 py-2.5">{row.class_name || '—'}</td>
                    <td className="px-4 py-2.5">{row.registration_date?.slice(0, 10)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[row.status]}`}>
                        {row.status === 'active' ? 'Registered' : row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        {row.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => admit(row)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                          >
                            <FiUserPlus />
                            Admit
                          </button>
                        )}
                        {row.status === 'admitted' && row.converted_student_id ? (
                          <Link
                            href={`/students/${row.converted_student_id}`}
                            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            View student
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            <FiEdit2 />
                            Edit
                          </button>
                        )}
                        {row.status !== 'admitted' && (
                          <button
                            type="button"
                            onClick={() => remove(row)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <FiTrash2 />
                            Delete
                          </button>
                        )}
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
        onSuccess={handleSaved}
        classes={classes}
        editing={editing}
        defaultAcademicYear={selectedAcademicYear?.name || ''}
      />
    </DashboardLayout>
  );
}
