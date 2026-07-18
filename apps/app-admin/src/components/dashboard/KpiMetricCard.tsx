'use client';

import type { ReactNode } from 'react';

function Sparkline({ color, points }: { color: string; points: number[] }) {
  const width = 88;
  const height = 32;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const coords = points
    .map((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-[88px]" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
}

export default function KpiMetricCard({
  title,
  value,
  subtitle,
  trend,
  trendPositive = true,
  sparkColor = '#3b82f6',
  sparkPoints,
  footer,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendPositive?: boolean;
  sparkColor?: string;
  sparkPoints?: number[];
  footer?: ReactNode;
}) {
  const points = sparkPoints ?? [3, 5, 4, 7, 6, 8, 9];

  return (
    <div className="dashboard-kpi-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <Sparkline color={sparkColor} points={points} />
      </div>
      {(trend || footer) && (
        <div className="mt-4 flex items-center justify-between gap-2">
          {trend ? (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                trendPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {trendPositive ? '↑' : '→'} {trend}
            </span>
          ) : (
            <span />
          )}
          {footer}
        </div>
      )}
    </div>
  );
}
