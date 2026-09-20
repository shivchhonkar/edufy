'use client';

import type { DashboardFeeRevenueSummary } from '@/shared/types';
import {
  dashboardStatCardClass,
  dashboardStatHeadingClass,
  dashboardStatMutedClass,
} from './dashboard-stat-card-styles';

interface FeeRevenueSummaryKpiCardProps {
  stats: DashboardFeeRevenueSummary;
  onClick?: () => void;
}

function formatCurrency(amount: number) {
  return `₹ ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatCompact(amount: number) {
  return amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function FeeRevenueSummaryKpiCard({
  stats,
  onClick,
}: FeeRevenueSummaryKpiCardProps) {
  const hasData = stats.total > 0;
  const collectionRate = hasData ? stats.received_percent : 0;

  return (
    <div
      className={dashboardStatCardClass(!!onClick)}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <p className={dashboardStatHeadingClass}>Fee Revenue (YTD)</p>
      <p className="text-xl font-medium text-green-600 leading-none mt-1 tabular-nums">
        {hasData ? formatCurrency(stats.total_received) : '₹ 0'}
      </p>

      <div className="mt-3 space-y-1.5 flex-1 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <span className={dashboardStatMutedClass}>Total Due</span>
          <span className="font-semibold text-[var(--theme-brand-dark)] tabular-nums">
            {hasData ? formatCompact(stats.total_due) : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={dashboardStatMutedClass}>Collected</span>
          <span className="font-semibold text-green-600 tabular-nums">
            {hasData ? formatCompact(stats.total_received) : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={dashboardStatMutedClass}>Discount</span>
          <span className="font-semibold text-[var(--theme-brand-dark)] tabular-nums">
            {hasData ? formatCompact(stats.total_discount) : '—'}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--theme-primary-100)]">
        <div className="flex items-center justify-between gap-2 text-[11px] mb-1.5">
          <span className={dashboardStatMutedClass}>Collection Rate</span>
          <span className="font-semibold text-[var(--theme-primary-700)] tabular-nums">
            {collectionRate}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--theme-primary-100)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--theme-primary-600)] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, collectionRate))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
