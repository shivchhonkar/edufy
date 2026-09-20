'use client';

import { MdOutlinePayments, MdAccountBalance } from 'react-icons/md';
import type { DashboardTodayCollectionStats } from '@/shared/types';
import {
  dashboardStatCardClass,
  dashboardStatDividerClass,
  dashboardStatHeadingClass,
  dashboardStatMutedClass,
} from './dashboard-stat-card-styles';

interface TodayCollectionKpiCardProps {
  stats: DashboardTodayCollectionStats;
  onClick?: () => void;
}

function formatAmount(amount: number) {
  return amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function TodayCollectionKpiCard({ stats, onClick }: TodayCollectionKpiCardProps) {
  const hasData = stats.total > 0 || stats.receipt_count > 0;

  return (
    <div
      className={dashboardStatCardClass(!!onClick)}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={dashboardStatHeadingClass}>Today Collection</p>
        <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
          Receipts: {stats.receipt_count.toLocaleString('en-IN')}
        </span>
      </div>

      <p className="text-xl font-medium text-amber-600 leading-none mt-1 tabular-nums">
        ₹ {hasData ? formatAmount(stats.total) : '0'}
      </p>

      <div className={`mt-3 pt-3 ${dashboardStatDividerClass} grid grid-cols-2 gap-3 flex-1 items-end`}>
        <div>
          <p className={`text-lg font-semibold leading-none tabular-nums ${hasData ? 'text-green-600' : 'text-gray-300'}`}>
            {hasData ? formatAmount(stats.cash) : '—'}
          </p>
          <p className={`flex items-center gap-1 text-[11px] ${dashboardStatMutedClass} mt-0.5`}>
            <MdOutlinePayments className="h-3.5 w-3.5 text-[var(--theme-primary-600)]" aria-hidden />
            Cash
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-semibold leading-none tabular-nums ${hasData ? 'text-[var(--theme-primary-600)]' : 'text-gray-300'}`}>
            {hasData ? formatAmount(stats.bank) : '—'}
          </p>
          <p className={`flex items-center justify-end gap-1 text-[11px] ${dashboardStatMutedClass} mt-0.5`}>
            <MdAccountBalance className="h-3.5 w-3.5 text-[var(--theme-primary-600)]" aria-hidden />
            Bank
          </p>
        </div>
      </div>
    </div>
  );
}
