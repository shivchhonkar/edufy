'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { formatDateTime, formatRelativeTime } from '@/lib/dashboard-time';
import type { ActivityLogCategory, ActivityLogEntry, ActivityLogsResponse } from '@/shared/types';
import {
  FiActivity,
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiExternalLink,
} from 'react-icons/fi';

const DAY_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
];

const CATEGORY_STYLES: Record<ActivityLogCategory, string> = {
  payment: 'bg-green-50 text-green-700',
  admission: 'bg-blue-50 text-blue-700',
  student: 'bg-indigo-50 text-indigo-700',
  communication: 'bg-purple-50 text-purple-700',
  exam: 'bg-amber-50 text-amber-700',
  staff: 'bg-slate-100 text-slate-700',
  attendance: 'bg-teal-50 text-teal-700',
};

export default function ActivityLogsPage() {
  const router = useRouter();
  const [data, setData] = useState<ActivityLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [days, setDays] = useState(90);
  const [page, setPage] = useState(1);
  const limit = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        days: String(days),
        category,
      });
      const res = await fetch(`/api/dashboard/activity-logs?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, days, category]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [category, days]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/dashboard" className="hover:text-primary-600 flex items-center gap-1">
                <FiArrowLeft size={14} /> Dashboard
              </Link>
            </div>
            <h1 className="text-xl text-gray-900 flex items-center gap-2">
              <FiActivity className="text-primary-600" />
              Activity Logs
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Unified timeline of fees, admissions, students, exams, staff, and communications.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {data?.categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === cat.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
                <span className="ml-1 opacity-80">({cat.count})</span>
              </button>
            ))}
          </div>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="ml-auto border rounded-lg px-3 py-2 text-sm bg-white"
          >
            {DAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Last {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading && !data ? (
            <div className="py-16 text-center text-gray-500">Loading activity logs…</div>
          ) : data && data.items.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {data.items.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} onNavigate={router.push} />
              ))}
            </ul>
          ) : (
            <div className="py-16 text-center text-gray-500">
              No activity found for the selected filters.
            </div>
          )}
        </div>

        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
            <p>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                <FiChevronLeft />
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ActivityRow({
  entry,
  onNavigate,
}: {
  entry: ActivityLogEntry;
  onNavigate: (href: string) => void;
}) {
  const style = CATEGORY_STYLES[entry.category];

  return (
    <li className="px-4 py-3 hover:bg-gray-50/80 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${style}`}>
              {entry.category}
            </span>
            <span className="text-xs text-gray-400">{formatRelativeTime(entry.occurred_at)}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 mt-1">{entry.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{entry.description}</p>
          <p className="text-[11px] text-gray-400 mt-1">{formatDateTime(entry.occurred_at)}</p>
        </div>
        {entry.href && (
          <button
            type="button"
            onClick={() => onNavigate(entry.href!)}
            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium shrink-0"
          >
            View <FiExternalLink size={12} />
          </button>
        )}
      </div>
    </li>
  );
}
