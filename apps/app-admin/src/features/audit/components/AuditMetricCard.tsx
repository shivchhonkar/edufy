'use client';

import type { IconType } from 'react-icons';

function Sparkline({ color, points }: { color: string; points: number[] }) {
  const width = 72;
  const height = 28;
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
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-[72px]" aria-hidden>
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

export default function AuditMetricCard({
  title,
  value,
  trend,
  trendPositive = true,
  icon: Icon,
  iconClassName,
  sparkColor = '#3b82f6',
}: {
  title: string;
  value: string | number;
  trend?: string;
  trendPositive?: boolean;
  icon: IconType;
  iconClassName: string;
  sparkColor?: string;
}) {
  return (
    <div className="audit-metric-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`audit-metric-icon ${iconClassName}`}>
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-1 text-xl font-medium tracking-tight text-slate-900">{value}</p>
          </div>
        </div>
        <Sparkline color={sparkColor} points={[3, 5, 4, 7, 6, 8, 9]} />
      </div>
      {trend && (
        <p className="mt-3 text-xs text-slate-500">
          <span
            className={`mr-1 font-semibold ${
              trendPositive ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {trendPositive ? '↑' : '→'} {trend}
          </span>
          vs last 30 days
        </p>
      )}
    </div>
  );
}
