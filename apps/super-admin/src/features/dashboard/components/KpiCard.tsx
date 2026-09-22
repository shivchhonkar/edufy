'use client';

import { IconType } from 'react-icons';

export const KPI_TONES = {
  blue: {
    card: 'bg-sky-50/90 border-sky-100',
    icon: '',
    value: 'text-slate-900',
  },
  green: {
    card: 'bg-emerald-50/90 border-emerald-100',
    icon: '',
    value: 'text-emerald-700',
  },
  purple: {
    card: 'bg-violet-50/90 border-violet-100',
    icon: '',
    value: 'text-slate-900',
  },
  orange: {
    card: 'bg-orange-50/90 border-orange-100',
    icon: '',
    value: 'text-orange-700',
  },
} as const;

export type KpiTone = keyof typeof KPI_TONES;

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: IconType;
  tone?: KpiTone;
  trend?: string;
  trendUp?: boolean | null;
  onClick?: () => void;
  children?: React.ReactNode;
}

export default function KpiCard({
  title,
  value,
  icon: Icon,
  tone = 'blue',
  trend,
  trendUp,
  onClick,
  children,
}: KpiCardProps) {
  const theme = KPI_TONES[tone];

  return (
    <div
      className={`flex h-full min-h-[148px] flex-col rounded-2xl border p-5 shadow-sm transition-all ${theme.card} ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''
      }`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${theme.icon}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="mt-1 text-sm font-medium text-slate-500">{title}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${theme.value}`}>
        {value}
      </p>
      {trend && (
        <p
          className={`mt-2 text-xs font-medium ${
            trendUp === true
              ? 'text-emerald-600'
              : trendUp === false
                ? 'text-rose-500'
                : 'text-slate-500'
          }`}
        >
          {trendUp === true ? '↑ ' : trendUp === false ? '↓ ' : ''}
          {trend}
        </p>
      )}
      {children}
    </div>
  );
}
