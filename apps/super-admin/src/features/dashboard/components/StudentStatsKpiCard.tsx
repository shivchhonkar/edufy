'use client';

import { FiUsers } from 'react-icons/fi';
import type { DashboardStudentStats } from '@/shared/types';
import KpiCard from './KpiCard';

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
  const previous = stats.previous_students;
  const changePct =
    previous > 0 ? Math.round(((stats.total - previous) / previous) * 100) : null;

  const trend =
    growthText ||
    (changePct !== null
      ? `${Math.abs(changePct)}% vs. last session`
      : `${stats.new_admissions.toLocaleString('en-IN')} new this session`);
  const trendUp = changePct === null ? (stats.new_admissions > 0 ? true : null) : changePct >= 0;

  return (
    <KpiCard
      title="Total Students"
      value={stats.total.toLocaleString('en-IN')}
      icon={FiUsers}
      tone="blue"
      trend={trend}
      trendUp={trendUp}
      onClick={onClick}
    >
      <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs text-slate-500">
        <span>
          Boys <strong className="font-semibold text-slate-700">{stats.boys.toLocaleString('en-IN')}</strong>
        </span>
        <span>
          Girls <strong className="font-semibold text-slate-700">{stats.girls.toLocaleString('en-IN')}</strong>
        </span>
        {leftCount > 0 && (
          <span>
            Left <strong className="font-semibold text-slate-700">{leftCount.toLocaleString('en-IN')}</strong>
          </span>
        )}
      </div>
    </KpiCard>
  );
}
