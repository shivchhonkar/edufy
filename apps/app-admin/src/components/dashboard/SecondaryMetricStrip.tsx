'use client';

type Metric = {
  label: string;
  value: string;
  hint?: string;
  accent?: 'blue' | 'green' | 'amber' | 'purple' | 'slate';
};

const accentClasses = {
  blue: 'border-blue-100 bg-blue-50/40',
  green: 'border-emerald-100 bg-emerald-50/40',
  amber: 'border-amber-100 bg-amber-50/40',
  purple: 'border-purple-100 bg-purple-50/40',
  slate: 'border-slate-200 bg-white',
};

export default function SecondaryMetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`rounded-2xl border px-4 py-4 shadow-sm ${accentClasses[metric.accent ?? 'slate']}`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{metric.value}</p>
          {metric.hint && <p className="mt-1 text-xs text-slate-500">{metric.hint}</p>}
        </div>
      ))}
    </div>
  );
}
