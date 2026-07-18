'use client';

import { formatCurrency } from '@edulakhya/utils';

function buildTrendPoints(total: number): number[] {
  const base = Math.max(total / 7, 1);
  return [0.55, 0.62, 0.58, 0.71, 0.68, 0.84, 1].map((factor) => Math.round(base * factor * 7));
}

export default function RevenueOverviewCard({ monthlyRevenue }: { monthlyRevenue: number }) {
  const points = buildTrendPoints(monthlyRevenue);
  const width = 560;
  const height = 180;
  const max = Math.max(...points, 1);
  const coords = points
    .map((value, index) => {
      const x = 24 + (index / Math.max(points.length - 1, 1)) * (width - 48);
      const y = height - 28 - (value / max) * (height - 56);
      return `${x},${y}`;
    })
    .join(' ');

  const areaCoords = `${coords} ${width - 24},${height - 28} 24,${height - 28}`;

  return (
    <div className="dashboard-panel h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Revenue Overview</h2>
          <p className="mt-3 text-3xl font-bold text-slate-900">{formatCurrency(monthlyRevenue)}</p>
          <p className="mt-1 text-sm text-emerald-600 font-medium">+12.5% vs last month</p>
        </div>
        <select className="dashboard-select" defaultValue="month">
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl bg-gradient-to-b from-blue-50/80 to-transparent px-2 pb-2 pt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" aria-hidden>
          <defs>
            <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon fill="url(#revenueFill)" points={areaCoords} />
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={coords}
          />
        </svg>
      </div>
    </div>
  );
}
