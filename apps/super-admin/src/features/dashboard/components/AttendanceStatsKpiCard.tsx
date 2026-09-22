'use client';

import { FiCalendar } from 'react-icons/fi';
import type { DashboardAttendanceStats } from '@/shared/types';
import KpiCard from './KpiCard';

interface AttendanceStatsKpiCardProps {
  stats: DashboardAttendanceStats;
  onClick?: () => void;
}

export default function AttendanceStatsKpiCard({ stats, onClick }: AttendanceStatsKpiCardProps) {
  const hasData = stats.marked > 0;
  const rateDisplay = hasData ? `${stats.rate}%` : '0%';
  const change = stats.rate_change;
  const trend = !hasData
    ? 'No data for today'
    : change === null
      ? `${stats.present.toLocaleString('en-IN')} present`
      : `${Math.abs(change)}% vs. yesterday`;

  return (
    <KpiCard
      title="Student Attendance"
      value={rateDisplay}
      icon={FiCalendar}
      tone="purple"
      trend={trend}
      trendUp={!hasData || change === null ? null : change >= 0}
      onClick={onClick}
    >
      {hasData && (
        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs text-slate-500">
          <span>
            Present <strong className="font-semibold text-emerald-600">{stats.present.toLocaleString('en-IN')}</strong>
          </span>
          <span>
            Absent <strong className="font-semibold text-rose-500">{stats.absent.toLocaleString('en-IN')}</strong>
          </span>
        </div>
      )}
    </KpiCard>
  );
}
