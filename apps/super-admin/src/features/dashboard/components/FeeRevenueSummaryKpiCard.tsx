'use client';

import type { DashboardFeeRevenueSummary } from '@/shared/types';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import KpiCard from './KpiCard';

interface FeeRevenueSummaryKpiCardProps {
  stats: DashboardFeeRevenueSummary;
  onClick?: () => void;
}

function formatCurrency(amount: number) {
  return `₹ ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function FeeRevenueSummaryKpiCard({
  stats,
  onClick,
}: FeeRevenueSummaryKpiCardProps) {
  const hasData = stats.total > 0;
  const collectionRate = hasData ? stats.received_percent : 0;

  return (
    <KpiCard
      title="Fee Revenue (YTD)"
      value={hasData ? formatCurrency(stats.total_received) : '₹ 0'}
      icon={RupeeIcon}
      tone="green"
      trend={`${collectionRate}% collected`}
      trendUp={collectionRate >= 50}
      onClick={onClick}
    >
      <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs text-slate-500">
        <span>
          Due{' '}
          <strong className="font-semibold text-slate-700">
            {hasData ? formatCurrency(stats.total_due) : '—'}
          </strong>
        </span>
        <span>
          Discount{' '}
          <strong className="font-semibold text-slate-700">
            {hasData ? formatCurrency(stats.total_discount) : '—'}
          </strong>
        </span>
      </div>
    </KpiCard>
  );
}
