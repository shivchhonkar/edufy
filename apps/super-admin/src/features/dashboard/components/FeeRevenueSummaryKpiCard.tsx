'use client';

import type { DashboardFeeRevenueSummary } from '@/shared/types';
import {
  dashboardStatCardClass,
  dashboardStatHeadingClass,
  dashboardStatMutedClass,
  dashboardStatValueClass,
} from './dashboard-stat-card-styles';

interface FeeRevenueSummaryKpiCardProps {
  stats: DashboardFeeRevenueSummary;
  onClick?: () => void;
}

function formatAmount(amount: number) {
  return amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function ProgressRow({
  label,
  amount,
  percent,
  barColor,
  showBar = true,
}: {
  label: string;
  amount: number;
  percent: number;
  barColor: 'red' | 'green';
  showBar?: boolean;
}) {
  const percentColor = barColor === 'red' ? 'text-red-500' : 'text-green-600';
  const barFill = barColor === 'red' ? 'bg-red-500' : 'bg-green-500';

  return (
    <div className={showBar ? 'space-y-1' : ''}>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className={dashboardStatMutedClass}>{label}</span>
        <span className="font-semibold text-[var(--theme-brand-dark)] tabular-nums">
          {formatAmount(amount)}{' '}
          <span className={`font-medium ${percentColor}`}>({percent}%)</span>
        </span>
      </div>
      {showBar && (
        <div className="h-1 w-full rounded-full bg-[var(--theme-primary-100)] overflow-hidden">
          <div
            className={`h-full rounded-full ${barFill} transition-all`}
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function FeeRevenueSummaryKpiCard({
  stats,
  onClick,
}: FeeRevenueSummaryKpiCardProps) {
  const hasData = stats.total > 0;

  return (
    <div
      className={dashboardStatCardClass(!!onClick)}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <p className={dashboardStatHeadingClass}>Fee Revenue Summary</p>
      <p className={`text-xl ${dashboardStatValueClass} mt-0.5`}>
        {hasData ? formatAmount(stats.total) : '—'}
      </p>

      <div className="mt-2.5 space-y-2 flex-1">
        <ProgressRow
          label="Total Due"
          amount={stats.total_due}
          percent={stats.due_percent}
          barColor="red"
        />
        <ProgressRow
          label="Total Received (YTD)"
          amount={stats.total_received}
          percent={stats.received_percent}
          barColor="green"
        />
        <ProgressRow
          label="Total Discount"
          amount={stats.total_discount}
          percent={stats.discount_percent}
          barColor="green"
          showBar={false}
        />
      </div>
    </div>
  );
}
