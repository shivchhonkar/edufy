'use client';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} aria-hidden />;
}

function KpiCardSkeleton({ tone = 'bg-sky-50' }: { tone?: string }) {
  return (
    <div className={`flex min-h-[148px] flex-col rounded-2xl border border-slate-100 p-5 ${tone}`}>
      <SkeletonBlock className="h-11 w-11 rounded-xl" />
      <SkeletonBlock className="mt-4 h-3 w-24" />
      <SkeletonBlock className="mt-2 h-8 w-20" />
      <SkeletonBlock className="mt-3 h-3 w-28" />
    </div>
  );
}

function PanelCardSkeleton({
  chartHeight = 'h-48',
  lines = 0,
}: {
  chartHeight?: string;
  lines?: number;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3">
        <div className="flex-1 space-y-1.5">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3 w-40" />
        </div>
        <SkeletonBlock className="h-3 w-16 shrink-0" />
      </div>
      <div className="flex-1 space-y-3 px-5 pb-5">
        <SkeletonBlock className={`w-full ${chartHeight} rounded-xl`} />
        {lines > 0 && (
          <div className="space-y-2 pt-1">
            {Array.from({ length: lines }).map((_, i) => (
              <SkeletonBlock key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-64" />
          <SkeletonBlock className="h-4 w-80" />
        </div>
        <SkeletonBlock className="h-8 w-36 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCardSkeleton tone="bg-sky-50" />
        <KpiCardSkeleton tone="bg-emerald-50" />
        <KpiCardSkeleton tone="bg-violet-50" />
        <KpiCardSkeleton tone="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <PanelCardSkeleton chartHeight="h-56" />
        </div>
        <div className="xl:col-span-4">
          <PanelCardSkeleton chartHeight="h-56" />
        </div>
        <div className="xl:col-span-3">
          <PanelCardSkeleton chartHeight="h-10" lines={5} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PanelCardSkeleton chartHeight="h-10" lines={4} />
        <PanelCardSkeleton chartHeight="h-32" />
        <PanelCardSkeleton chartHeight="h-10" lines={4} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <PanelCardSkeleton key={`breakdown-${i}`} chartHeight="h-48" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PanelCardSkeleton chartHeight="h-10" lines={4} />
        <PanelCardSkeleton chartHeight="h-10" lines={4} />
        <PanelCardSkeleton chartHeight="h-10" lines={3} />
      </div>
    </div>
  );
}
