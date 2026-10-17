'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import AddStaffModal from '@/features/staff/components/AddStaffModal';
import { TeachersStatsSkeleton } from '@/features/academics/components/TeachersStatsSkeleton';
import TeachersTableSkeleton from '@/features/academics/components/TeachersTableSkeleton';
import { useDialog } from '@/shared/context/DialogContext';
import type { Staff } from '@/shared/types';
import {
  FiEdit2,
  FiExternalLink,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUserCheck,
} from 'react-icons/fi';

type TeacherRecord = Staff & {
  assignment_count?: number;
  department_name?: string | null;
  designation_name?: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-700',
  resigned: 'bg-amber-100 text-amber-800',
  terminated: 'bg-red-100 text-red-800',
};

export default function TeachersPage() {
  const { alert } = useDialog();
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<TeacherRecord | null>(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '500', page: '1' });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/teachers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTeachers(data.data);
      } else {
        await alert(data.error || 'Failed to load teachers', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      await alert('Failed to load teachers', { title: 'Error', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, alert]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeachers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchTeachers]);

  const totalAssignments = useMemo(
    () => teachers.reduce((sum, teacher) => sum + (teacher.assignment_count ?? 0), 0),
    [teachers],
  );

  const openCreate = () => {
    setEditingTeacher(null);
    setShowModal(true);
  };

  const openEdit = (teacher: TeacherRecord) => {
    setEditingTeacher(teacher);
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTeacher) return;
    try {
      const res = await fetch(`/api/staff/${deletingTeacher.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeletingTeacher(null);
        await fetchTeachers();
        await alert(data.message || 'Teacher removed', { title: 'Success', type: 'success' });
      } else {
        await alert(data.error || 'Failed to delete teacher', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      await alert('Failed to delete teacher', { title: 'Error', type: 'error' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Teachers</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Staff with a teacher designation, or already assigned to a class or subject.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/academics/teacher-assignments"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <FiUserCheck size={14} />
              Assignments
            </Link>
            <button
              type="button"
              onClick={fetchTeachers}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <FiRefreshCw size={14} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
            >
              <FiPlus size={14} />
              Add teacher
            </button>
          </div>
        </div>

        {/* <div className="flex items-start gap-2 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-xs">
            Only employees in the <strong>Teaching</strong> department appear here. Clerks, principals,
            drivers, and other non-teaching staff are managed under Employee Management.
          </p>
        </div> */}

        {loading ? (
          <TeachersStatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Teachers</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">{teachers.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Assignments</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">{totalAssignments}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Showing</p>
              <p className="mt-0.5 text-sm font-medium capitalize text-gray-900">{statusFilter}</p>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex shrink-0 flex-col gap-2 border-b border-gray-100 px-3 py-2.5 sm:flex-row">
            <div className="relative flex-1">
              <FiSearch className="absolute left-2.5 top-2 text-gray-400" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, employee ID, phone, or email"
                className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:w-40"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          <div className="min-h-0 flex-1">
            {loading ? (
              <TeachersTableSkeleton fillHeight />
            ) : teachers.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-500">
                No teachers found. Add a teacher, set a Teacher designation, or assign staff to a class or subject.
              </div>
            ) : (
              <div className="h-full min-h-0 overflow-x-auto overflow-y-auto">
                <table className="min-w-full text-xs">
                <thead className="sticky top-0 border-b border-gray-100 bg-gray-50">
                  <tr>
                    {['S.N.', 'Teacher', 'Employee ID', 'Contact', 'Qualification', 'Assignments', 'Status', ''].map((label) => (
                      <th
                        key={label || 'actions'}
                        className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 ${label ? 'text-left' : 'text-right'}`}
                      >
                        {label || 'Actions'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teachers.map((teacher, index) => (
                    <tr key={teacher.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 tabular-nums text-gray-500">{index + 1}</td>
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-900">
                          {teacher.first_name} {teacher.last_name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {teacher.designation || teacher.designation_name || 'Teacher'}
                        </p>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{teacher.employee_id}</td>
                      <td className="px-4 py-2">
                        <p className="text-gray-900">{teacher.phone}</p>
                        {teacher.email && <p className="text-[11px] text-gray-500">{teacher.email}</p>}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{teacher.qualification || '—'}</td>
                      <td className="px-4 py-2 tabular-nums">{teacher.assignment_count ?? 0}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                            STATUS_BADGE[teacher.status] || STATUS_BADGE.inactive
                          }`}
                        >
                          {teacher.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/staff/${teacher.id}`}
                            className="p-2 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                            title="Open in staff profile"
                          >
                            <FiExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(teacher)}
                            className="p-2 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                            title="Edit teacher"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTeacher(teacher)}
                            className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Delete teacher"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddStaffModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTeacher(null);
        }}
        onSuccess={fetchTeachers}
        editingStaff={editingTeacher}
        teacherMode
      />

      <ConfirmDialog
        isOpen={!!deletingTeacher}
        title="Delete teacher"
        message={`Remove ${deletingTeacher?.first_name} ${deletingTeacher?.last_name}? This deletes the shared staff record, same as Staff Management.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTeacher(null)}
        type="danger"
      />
    </DashboardLayout>
  );
}
