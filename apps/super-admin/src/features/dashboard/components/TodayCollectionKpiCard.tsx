'use client';

import { MdOutlinePayments } from 'react-icons/md';
import type { DashboardTodayCollectionStats } from '@/shared/types';
import KpiCard from './KpiCard';

interface TodayCollectionKpiCardProps {
  stats: DashboardTodayCollectionStats;
  onClick?: () => void;
}

function formatAmount(amount: number) {
  return `₹ ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function TodayCollectionKpiCard({ stats, onClick }: TodayCollectionKpiCardProps) {
  const hasData = stats.total > 0 || stats.receipt_count > 0;

  return (
    <KpiCard
      title="Today Collection"
      value={hasData ? formatAmount(stats.total) : '₹ 0'}
      icon={MdOutlinePayments}
      tone="orange"
      trend={
        stats.receipt_count > 0
          ? `${stats.receipt_count.toLocaleString('en-IN')} receipt${stats.receipt_count === 1 ? '' : 's'}`
          : 'No receipts yet'
      }
      trendUp={hasData ? true : null}
      onClick={onClick}
    >
      <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs text-slate-500">
        <span>
          Cash <strong className="font-semibold text-slate-700">{hasData ? formatAmount(stats.cash) : '—'}</strong>
        </span>
        <span>
          Bank <strong className="font-semibold text-slate-700">{hasData ? formatAmount(stats.bank) : '—'}</strong>
        </span>
      </div>
    </KpiCard>
  );
}
