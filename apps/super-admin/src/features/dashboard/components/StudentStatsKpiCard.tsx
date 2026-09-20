'use client';

import { FiUsers } from 'react-icons/fi';
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
  growthText?: string;
  leftCount?: number;
  onClick?: () => void;
}

export default function StudentStatsKpiCard({
  stats,
  growthText,
  leftCount = 0,
  onClick,
}: StudentStatsKpiCardProps) {
  return (
    <div
      className={dashboardStatCardClass(!!onClick)}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={dashboardStatTitleClass}>Total Students</p>
          <p className={`text-xl font-medium ${dashboardStatValueClass} leading-none mt-1`}>
            {stats.total.toLocaleString('en-IN')}
          </p>
          {growthText && (
            <p className="mt-1 text-[11px] font-medium text-green-600">{growthText}</p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary-100)] text-[var(--theme-primary-700)]">
          <FiUsers className="h-4 w-4" aria-hidden />
        </div>
      </div>

      <div className="mt-3 space-y-1.5 flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[var(--theme-muted-font)]">
            <IoMale className="w-3.5 h-3.5 text-[var(--theme-primary-600)]" aria-hidden />
            Boys
          </span>
          <span className="font-semibold text-[var(--theme-brand-dark)] tabular-nums">
            {stats.boys.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[var(--theme-muted-font)]">
            <IoFemale className="w-3.5 h-3.5 text-pink-500" aria-hidden />
            Girls
          </span>
          <span className="font-semibold text-[var(--theme-brand-dark)] tabular-nums">
            {stats.girls.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className={`mt-3 pt-3 ${dashboardStatDividerClass} flex flex-wrap gap-1.5`}>
        <span className="inline-flex items-center rounded-full bg-[var(--theme-primary-100)] px-2 py-0.5 text-[10px] font-medium text-[var(--theme-primary-800)]">
          New : {stats.new_admissions.toLocaleString('en-IN')}
        </span>
        <span className="inline-flex items-center rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-medium text-pink-700">
          Left : {leftCount.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
}
