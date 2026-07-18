'use client';

type Slice = {
  label: string;
  value: number;
  color: string;
};

function DonutChart({ slices, total }: { slices: Slice[]; total: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const sum = slices.reduce((acc, slice) => acc + slice.value, 0) || 1;
  let offset = 0;

  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="16" />
        {slices.map((slice) => {
          const length = (slice.value / sum) * circumference;
          const dasharray = `${length} ${circumference - length}`;
          const dashoffset = -offset;
          offset += length;
          return (
            <circle
              key={slice.label}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="16"
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900">{total}</span>
        <span className="text-xs text-slate-500">Total</span>
      </div>
    </div>
  );
}

export default function SubscriptionStatusCard({
  active,
  trial,
  expired,
  inactive,
}: {
  active: number;
  trial: number;
  expired: number;
  inactive: number;
}) {
  const total = active + trial + expired + inactive;
  const slices: Slice[] = [
    { label: 'Active', value: active, color: '#22c55e' },
    { label: 'Trial', value: trial, color: '#8b5cf6' },
    { label: 'Expired', value: expired, color: '#ef4444' },
    { label: 'Inactive', value: inactive, color: '#f97316' },
  ];

  return (
    <div className="dashboard-panel h-full">
      <h2 className="text-lg font-semibold text-slate-900">Subscription Status</h2>
      <div className="mt-4">
        <DonutChart slices={slices} total={total} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
            <span>
              {slice.label}: <strong className="text-slate-900">{slice.value}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
