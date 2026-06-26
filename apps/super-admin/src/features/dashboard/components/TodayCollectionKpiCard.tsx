'use client';

import { FiExternalLink } from 'react-icons/fi';
import { MdOutlinePayments, MdAccountBalance } from 'react-icons/md';
import type { DashboardTodayCollectionStats } from '@/shared/types';
import {
  dashboardStatCardClass,
  dashboardStatDividerClass,
  dashboardStatHeadingClass,
  dashboardStatMutedClass,
  dashboardStatValueClass,
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
        {onClick && (
          <FiExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--theme-primary-700)]" aria-hidden />
        )}
      </div>

      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className={`text-2xl ${dashboardStatValueClass} leading-none`}>
          {hasData ? formatAmount(stats.total) : '0'}
        </p>
        <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--theme-primary-100)] px-2 py-0.5 text-[10px] font-medium text-[var(--theme-primary-800)]">
          Receipts: {stats.receipt_count.toLocaleString('en-IN')}
        </span>
      </div>

      <div className={`mt-2.5 pt-2.5 ${dashboardStatDividerClass} grid grid-cols-2 gap-2 flex-1 items-end`}>
        <div>
          <p
            className={`text-lg font-semibold leading-none ${
              hasData ? 'text-green-600' : 'text-gray-300'
            }`}
          >
            {hasData ? formatAmount(stats.cash) : '—'}
          </p>
          <p className={`flex items-center gap-1 text-[11px] ${dashboardStatMutedClass} mt-0.5`}>
            <MdOutlinePayments className="h-3.5 w-3.5 text-green-600" aria-hidden />
            Cash
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-lg font-semibold leading-none ${
              hasData ? 'text-[var(--theme-primary-600)]' : 'text-gray-300'
            }`}
          >
            {hasData ? formatAmount(stats.bank) : '—'}
          </p>
          <p className={`flex items-center justify-end gap-1 text-[11px] ${dashboardStatMutedClass} mt-0.5`}>
            <MdAccountBalance className="h-3.5 w-3.5 text-[var(--theme-primary-600)]" aria-hidden />
            Bank
          </p>
        </div>
      </div>

      {!hasData && (
        <p className="text-[10px] text-[var(--theme-muted-font)] mt-1.5 text-center">No collections today</p>
      )}
    </div>
  );
}
