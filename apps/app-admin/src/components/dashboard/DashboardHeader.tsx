'use client';

import { useMemo } from 'react';
import { FiBell, FiCalendar, FiChevronDown, FiRefreshCw } from 'react-icons/fi';
import { getUser } from '@/lib/auth';

export default function DashboardHeader({
  onRefresh,
  refreshing,
}: {
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const user = getUser();
  const displayName = String(user?.full_name || 'Super Admin');
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const dateLabel = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt.format(start)} – ${fmt.format(now)}`;
  }, []);

  return (
    <div className="dashboard-header">
      <div className="dashboard-header-copy">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">
          Welcome back, {displayName.split(' ')[0] || 'Super Admin'}! Here&apos;s what&apos;s happening on
          your platform.
        </p>
      </div>

      <div className="dashboard-header-actions">
        <button type="button" className="dashboard-toolbar-btn shrink-0" aria-label={dateLabel}>
          <FiCalendar size={16} className="shrink-0" />
          <span className="hidden 2xl:inline">{dateLabel}</span>
        </button>
        <button
          type="button"
          className="dashboard-toolbar-btn shrink-0"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh dashboard"
        >
          <FiRefreshCw size={16} className={refreshing ? 'animate-spin' : 'shrink-0'} />
          <span className="hidden lg:inline">Refresh</span>
        </button>
        <button type="button" className="dashboard-icon-btn relative shrink-0" aria-label="Notifications">
          <FiBell size={18} />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            8
          </span>
        </button>
        <button type="button" className="dashboard-profile-btn shrink-0">
          <span className="dashboard-avatar">{initials || 'SA'}</span>
          <span className="hidden md:block max-w-[9rem] truncate text-sm font-medium text-slate-800">
            {displayName}
          </span>
          <FiChevronDown size={16} className="hidden md:block shrink-0 text-slate-500" />
        </button>
      </div>
    </div>
  );
}
