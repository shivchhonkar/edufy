'use client';

import { useCallback, useEffect, useState } from 'react';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useSettings } from '@/shared/SettingsContext';

interface ReminderRow {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
  channels: string[];
  message: string;
  amount_due: string | number;
  sent_by_name?: string;
  sent_at: string;
}

export default function FeeReminderReportPage() {
  const { settings } = useSettings();
  const { selectedAcademicYear } = useEnrollmentSession();
  const academicYear = selectedAcademicYear?.name || settings.academic_year || '';
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams({ academic_year: academicYear });
    if (search) params.set('search', search);
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    const res = await fetch(`/api/fees/reminders?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, [academicYear, search, fromDate, toDate]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-4">
      <FeesPageHeader title="Reminder Report" description="History of fee reminders sent to parents." />
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student"
          className="min-w-[200px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">No reminders logged yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="px-4 py-3">
              <div className="flex justify-between gap-3">
                <p className="font-medium text-gray-900">
                  {row.first_name} {row.last_name}
                  <span className="ml-2 text-xs font-normal text-gray-500">{row.admission_number}</span>
                </p>
                <p className="text-xs text-gray-500">{new Date(row.sent_at).toLocaleString()}</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {row.class_name || '—'} · {(row.channels || []).join(', ')} · Due {formatFeeCurrency(row.amount_due)} · {row.sent_by_name || 'Staff'}
              </p>
              <p className="text-sm text-gray-700 mt-1">{row.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
