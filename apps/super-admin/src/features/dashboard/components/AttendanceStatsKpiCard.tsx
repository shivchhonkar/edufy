'use client';

import type { DashboardAttendanceStats } from '@/shared/types';
import {
  dashboardStatCardClass,
  dashboardStatDividerClass,
  dashboardStatHeadingClass,
  dashboardStatMutedClass,
} from './dashboard-stat-card-styles';

interface AttendanceStatsKpiCardProps {
  stats: DashboardAttendanceStats;
  onClick?: () => void;
}

export default function AttendanceStatsKpiCard({ stats, onClick }: AttendanceStatsKpiCardProps) {
  const hasData = stats.marked > 0;
  const rateDisplay = hasData ? `${stats.rate}%` : '0%';

  return (
    <div
      className={dashboardStatCardClass(!!onClick)}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <p className={dashboardStatHeadingClass}>Student Attendance</p>
      <p className="text-xl font-medium text-[var(--theme-brand-dark)] leading-none mt-1 tabular-nums">
        {rateDisplay}
      </p>

      <div className={`mt-3 pt-3 ${dashboardStatDividerClass} grid grid-cols-2 gap-3 flex-1 items-end`}>
        <div>
          <p className={`text-xl font-semibold leading-none tabular-nums ${hasData ? 'text-green-600' : 'text-gray-300'}`}>
            {hasData ? stats.present.toLocaleString('en-IN') : '0'}
          </p>
          <p className={`text-[11px] ${dashboardStatMutedClass} mt-0.5`}>Present</p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-semibold leading-none tabular-nums ${hasData ? 'text-red-500' : 'text-gray-300'}`}>
            {hasData ? stats.absent.toLocaleString('en-IN') : '0'}
          </p>
          <p className={`text-[11px] ${dashboardStatMutedClass} mt-0.5`}>Absent</p>
        </div>
      </div>

      {!hasData && (
        <p className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
          Not marked today
        </p>
      )}
    </div>
  );
}
