'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HolidayFormModal from '@/features/settings/components/HolidayFormModal';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useDialog } from '@/shared/context/DialogContext';
import {
  formatHolidayRange,
  holidayTitle,
  type HolidayRecord,
  type HolidayScope,
} from '@/lib/holiday-utils';

interface ClassOption {
  id: number;
  name: string;
}

export default function HolidaySettingsPage() {
  const { confirm } = useDialog();
  const { academicYears, selectedAcademicYear, setSelectedAcademicYearId, loading: yearsLoading } =
    useEnrollmentSession();
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeFilter, setScopeFilter] = useState<'all' | HolidayScope>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HolidayRecord | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sessionName = selectedAcademicYear?.name || '';

  const loadClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes?active_only=true', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setClasses(data.data || []);
    } catch {
      setClasses([]);
    }
  }, []);

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sessionName) params.set('academic_year', sessionName);
      const res = await fetch(`/api/holidays?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setHolidays(data.data || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load holidays' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load holidays' });
    } finally {
      setLoading(false);
    }
  }, [sessionName]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (!yearsLoading) void loadHolidays();
  }, [yearsLoading, loadHolidays]);

  const visibleHolidays = useMemo(() => {
    if (scopeFilter === 'all') return holidays;
    return holidays.filter((holiday) => holiday.scope === scopeFilter);
  }, [holidays, scopeFilter]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (holiday: HolidayRecord) => {
    setEditing(holiday);
    setModalOpen(true);
  };

  const remove = async (holiday: HolidayRecord) => {
    const confirmed = await confirm(
      `Delete holiday "${holidayTitle(holiday)}" (${formatHolidayRange(holiday.start_date, holiday.end_date)})?`,
      {
        title: 'Delete Holiday',
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/holidays/${holiday.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setMessage({ type: 'error', text: data.error || 'Failed to delete holiday' });
        return;
      }
      setMessage({ type: 'success', text: 'Holiday deleted' });
      await loadHolidays();
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete holiday' });
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Holidays</h1>
            <p className="mt-1 text-sm text-gray-500">
              Add school-wise or class-wise holidays with session, date range, and remark.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <FiPlus />
            Add holiday
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>Session</span>
            <select
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              value={selectedAcademicYear?.id ?? ''}
              onChange={(e) =>
                setSelectedAcademicYearId(e.target.value ? parseInt(e.target.value, 10) : null)
              }
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>Show</span>
            <select
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as 'all' | HolidayScope)}
            >
              <option value="all">All holidays</option>
              <option value="school">School-wise</option>
              <option value="class">Class-wise</option>
            </select>
          </label>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border border-green-200 bg-green-50 text-green-800'
                : 'border border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Session</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Class</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">From – To</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Remark</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || yearsLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <FiRefreshCw className="mr-2 inline animate-spin" />
                    Loading holidays...
                  </td>
                </tr>
              ) : visibleHolidays.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No holidays for this session yet.
                  </td>
                </tr>
              ) : (
                visibleHolidays.map((holiday) => (
                  <tr key={holiday.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{holiday.academic_year || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          holiday.scope === 'class'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-blue-50 text-blue-800'
                        }`}
                      >
                        {holiday.scope === 'class' ? 'Class-wise' : 'School-wise'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {holiday.scope === 'class' ? holiday.class_name || '—' : 'All classes'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatHolidayRange(holiday.start_date, holiday.end_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{holidayTitle(holiday)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(holiday)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                          aria-label="Edit holiday"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(holiday)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete holiday"
                        >
                          <FiTrash2 size={16} />
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

      <HolidayFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSuccess={() => {
          setMessage({ type: 'success', text: editing ? 'Holiday updated' : 'Holiday added' });
          void loadHolidays();
        }}
        academicYears={academicYears}
        classes={classes}
        defaultAcademicYear={sessionName}
        holiday={editing}
      />
    </DashboardLayout>
  );
}
