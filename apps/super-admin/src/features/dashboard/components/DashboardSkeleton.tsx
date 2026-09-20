'use client';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200/80 ${className}`} aria-hidden />;
}

function KpiCardSkeleton() {
  return (
    <div className="dashboard-stat-card rounded-xl p-3.5 flex flex-col h-full min-h-[148px]">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-7 w-16" />
        </div>
        <SkeletonBlock className="h-9 w-9 rounded-full shrink-0" />
      </div>
      <div className="mt-3 space-y-2 flex-1">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-3 w-12" />
          <SkeletonBlock className="h-3 w-8" />
        </div>
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-3 w-12" />
          <SkeletonBlock className="h-3 w-8" />
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--theme-primary-100)] flex gap-1.5">
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
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex-1 space-y-1.5">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3 w-48" />
        </div>
        <SkeletonBlock className="h-3 w-16 shrink-0" />
      </div>
      <div className="flex-1 space-y-3 p-4">
        <SkeletonBlock className={`w-full ${chartHeight} rounded-lg`} />
        {lines > 0 && (
          <div className="space-y-2 pt-1">
            {Array.from({ length: lines }).map((_, i) => (
              <SkeletonBlock key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleCardSkeleton() {
  return (
    <div className="flex h-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-6 w-10" />
        <SkeletonBlock className="h-3 w-28" />
      </div>
      <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex justify-end">
        <SkeletonBlock className="h-9 w-44 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={`kpi-${i}`} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PanelCardSkeleton chartHeight="h-52" />
        <PanelCardSkeleton chartHeight="h-52" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PanelCardSkeleton chartHeight="h-32" lines={3} />
        <PanelCardSkeleton chartHeight="h-32" lines={2} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <PanelCardSkeleton key={`breakdown-${i}`} chartHeight="h-40" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PanelCardSkeleton chartHeight="h-32" lines={4} />
        <PanelCardSkeleton chartHeight="h-52" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PanelCardSkeleton chartHeight="h-36" lines={3} />
        <PanelCardSkeleton chartHeight="h-36" lines={3} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ModuleCardSkeleton key={`module-${i}`} />
        ))}
      </div>
    </div>
  );
}
