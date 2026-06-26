'use client';

import { FiExternalLink } from 'react-icons/fi';
import { PiHandPointingFill } from 'react-icons/pi';
import type { DashboardAttendanceStats } from '@/shared/types';
import {
  dashboardStatCardClass,
  dashboardStatDividerClass,
  dashboardStatHeadingClass,
  dashboardStatMutedClass,
  dashboardStatValueClass,
} from './dashboard-stat-card-styles';

interface AttendanceStatsKpiCardProps {
  stats: DashboardAttendanceStats;
  onClick?: () => void;
}

export default function AttendanceStatsKpiCard({ stats, onClick }: AttendanceStatsKpiCardProps) {
  const hasData = stats.marked > 0;
  const presentPercent = hasData
    ? Math.round((stats.present / stats.marked) * 1000) / 10
    : 0;
  const trendUp = stats.rate_change !== null && stats.rate_change >= 0;
  const showTrend = hasData && stats.rate_change !== null;

  return (
    <div
      className={dashboardStatCardClass(!!onClick)}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col items-start shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--theme-primary-100)] text-[var(--theme-primary-700)]">
            <PiHandPointingFill className="h-4 w-4" aria-hidden />
          </div>
          {hasData && (
            <span
              className={`mt-1.5 text-xs font-semibold leading-none ${
                showTrend ? (trendUp ? 'text-green-600' : 'text-red-500') : 'text-[var(--theme-brand-dark)]'
              }`}
            >
              {presentPercent}%
              {showTrend && (trendUp ? ' ↑' : ' ↓')}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <p className={dashboardStatHeadingClass}>Student Attendance</p>
            {onClick && (
              <FiExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--theme-primary-700)]" aria-hidden />
            )}
          </div>
          <p className={`text-2xl ${dashboardStatValueClass} leading-none mt-0.5`}>
            {hasData ? stats.marked.toLocaleString('en-IN') : '0'}
          </p>
        </div>
      </div>

      <div className={`mt-2.5 pt-2.5 ${dashboardStatDividerClass} grid grid-cols-2 gap-2 flex-1 items-end`}>
        <div>
          <p
            className={`text-xl font-semibold leading-none ${
              hasData ? 'text-pink-500' : 'text-gray-300'
            }`}
          >
            {hasData ? stats.absent.toLocaleString('en-IN') : '0'}
          </p>
          <p className={`text-[11px] ${dashboardStatMutedClass} mt-0.5`}>Absent</p>
        </div>
        <div className="text-right">
          <p
            className={`text-xl font-semibold leading-none ${
              hasData ? 'text-green-600' : 'text-gray-300'
            }`}
          >
            {hasData ? stats.present.toLocaleString('en-IN') : '0'}
          </p>
          <p className={`text-[11px] ${dashboardStatMutedClass} mt-0.5`}>Present</p>
        </div>
      </div>

      {!hasData && (
        <p className="text-[10px] text-[var(--theme-muted-font)] mt-1.5 text-center">Not marked today</p>
      )}
    </div>
  );
}
