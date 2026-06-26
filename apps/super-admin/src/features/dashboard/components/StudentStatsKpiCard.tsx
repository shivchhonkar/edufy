'use client';

import { IoMale, IoFemale } from 'react-icons/io5';
import type { DashboardStudentStats } from '@/shared/types';
import {
  dashboardStatCardClass,
  dashboardStatDividerClass,
  dashboardStatTitleClass,
  dashboardStatValueClass,
} from './dashboard-stat-card-styles';

interface StudentStatsKpiCardProps {
  stats: DashboardStudentStats;
  onClick?: () => void;
}

export default function StudentStatsKpiCard({ stats, onClick }: StudentStatsKpiCardProps) {
  return (
    <div
      className={dashboardStatCardClass(!!onClick)}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={dashboardStatTitleClass}>Total Student</p>
        <p className={`text-2xl ${dashboardStatValueClass} leading-none`}>
          {stats.total.toLocaleString('en-IN')}
        </p>
      </div>

      <div className="mt-2.5 space-y-1 flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[var(--theme-muted-font)]">
            <IoMale className="w-3.5 h-3.5 text-[var(--theme-primary-600)]" aria-hidden />
            Boy
          </span>
          <span className="font-semibold text-[var(--theme-brand-dark)]">
            {stats.boys.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[var(--theme-muted-font)]">
            <IoFemale className="w-3.5 h-3.5 text-pink-500" aria-hidden />
            Girl
          </span>
          <span className="font-semibold text-[var(--theme-brand-dark)]">
            {stats.girls.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className={`mt-2.5 pt-2.5 ${dashboardStatDividerClass} flex flex-wrap gap-1.5`}>
        <span className="inline-flex items-center rounded-full bg-[var(--theme-primary-100)] px-2 py-0.5 text-[10px] font-medium text-[var(--theme-primary-800)]">
          New : {stats.new_admissions.toLocaleString('en-IN')}
        </span>
        <span className="inline-flex items-center rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-medium text-pink-700">
          Old : {stats.previous_students.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
}
