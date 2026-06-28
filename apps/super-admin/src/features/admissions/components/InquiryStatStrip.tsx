'use client';

import type { InquiryStatus } from '@/lib/admission-inquiry-api';
import {
  PIPELINE_STATUSES,
  STATUS_COLUMN_META,
  STATUS_LABELS,
} from '@/features/admissions/utils/inquiry-labels';
import {
  FiCalendar,
  FiClipboard,
  FiPhone,
  FiStar,
  FiTrendingUp,
  FiUserCheck,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

interface Stats {
  total: number;
  new_this_week: number;
  by_status: Record<string, number>;
}

const STATUS_ICONS: Record<(typeof PIPELINE_STATUSES)[number], IconType> = {
  new: FiClipboard,
  contacted: FiPhone,
  visit_scheduled: FiCalendar,
  interested: FiStar,
  registered: FiUserCheck,
};

interface InquiryStatStripProps {
  stats: Stats;
  activeStatus: string;
  onStatusClick: (status: InquiryStatus | '') => void;
}

export default function InquiryStatStrip({
  stats,
  activeStatus,
  onStatusClick,
}: InquiryStatStripProps) {
  const weekPct =
    stats.total > 0 ? Math.round((stats.new_this_week / stats.total) * 100) : 0;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      <button
        type="button"
        onClick={() => onStatusClick('')}
        className={`shrink-0 min-w-[10.5rem] rounded-lg border bg-white p-3.5 text-left transition-all hover:shadow-sm ${
          activeStatus === '' ? 'border-primary-300 ring-1 ring-primary-200' : 'border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <FiTrendingUp size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Total Inquiries
            </p>
            <p className="text-2xl text-gray-900 leading-tight">{stats.total}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          This week{' '}
          <span className="font-semibold text-primary-700">
            {stats.new_this_week} new
            {weekPct > 0 ? ` · ${weekPct}%` : ''}
          </span>
        </p>
      </button>

      {PIPELINE_STATUSES.map((status) => {
        const meta = STATUS_COLUMN_META[status];
        const Icon = STATUS_ICONS[status];
        const count = stats.by_status[status] || 0;
        const isActive = activeStatus === status;

        return (
          <button
            key={status}
            type="button"
            onClick={() => onStatusClick(status)}
            className={`shrink-0 min-w-[10rem] rounded-lg border bg-white p-3.5 text-left transition-all hover:shadow-sm ${
              isActive ? 'border-primary-300 ring-1 ring-primary-200' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${meta.iconBg} ${meta.iconColor}`}
              >
                <Icon size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-600 truncate">
                  {STATUS_LABELS[status]}
                </p>
                <p className="text-xl text-gray-900 leading-tight">{count}</p>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 truncate">{meta.statHint}</p>
          </button>
        );
      })}
    </div>
  );
}
