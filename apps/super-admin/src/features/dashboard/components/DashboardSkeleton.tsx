'use client';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200/80 ${className}`} aria-hidden />;
}

function KpiCardSkeleton() {
  return (
    <div className="dashboard-stat-card rounded-xl p-3.5 flex flex-col h-full min-h-[132px]">
      <div className="flex items-start justify-between gap-2">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-7 w-12" />
      </div>
      <div className="mt-3 space-y-2 flex-1">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-3 w-10" />
          <SkeletonBlock className="h-3 w-6" />
        </div>
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-3 w-10" />
          <SkeletonBlock className="h-3 w-6" />
        </div>
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-[var(--theme-primary-100)] flex gap-1.5">
        <SkeletonBlock className="h-5 w-16 rounded-full" />
        <SkeletonBlock className="h-5 w-16 rounded-full" />
      </div>
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-4 w-10 rounded-full" />
          </div>
          <SkeletonBlock className="h-3 w-40" />
        </div>
        <SkeletonBlock className="h-3 w-10 shrink-0" />
      </div>
      <div className="p-4 flex-1 space-y-3">
        <SkeletonBlock className={`w-full ${chartHeight} rounded-lg`} />
        {lines > 0 && (
          <div className="space-y-2 pt-1">
            {Array.from({ length: lines }).map((_, i) => (
              <SkeletonBlock key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-6 w-10" />
          <SkeletonBlock className="h-3 w-28" />
        </div>
        <SkeletonBlock className="h-10 w-10 rounded-xl shrink-0" />
      </div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      {/* Row 1 — KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={`kpi-${i}`} />
        ))}
      </div>

      {/* Row 2 — Trend charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PanelCardSkeleton chartHeight="h-52" />
        <PanelCardSkeleton chartHeight="h-52" />
      </div>

      {/* Row 2b — Donut charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PanelCardSkeleton chartHeight="h-44" />
        <PanelCardSkeleton chartHeight="h-44" />
      </div>

      {/* Row 2c — Breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <PanelCardSkeleton key={`breakdown-${i}`} chartHeight="h-40" />
        ))}
      </div>

      {/* Row 3 — Classes + teacher performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PanelCardSkeleton chartHeight="h-32" lines={3} />
        <PanelCardSkeleton chartHeight="h-52" />
      </div>

      {/* Row 4 — Alerts & activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PanelCardSkeleton chartHeight="h-36" lines={2} />
        <PanelCardSkeleton chartHeight="h-36" lines={2} />
      </div>

      {/* Row 5 — Module shortcuts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <ModuleCardSkeleton key={`module-${i}`} />
        ))}
      </div>
    </div>
  );
}
