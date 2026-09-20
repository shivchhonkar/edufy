'use client';

const PULSE = 'animate-pulse bg-gray-200 rounded-md';

function Bone({ className = '' }: { className?: string }) {
  return <div className={`${PULSE} ${className}`} aria-hidden />;
}

export function SettingsOverviewSkeleton() {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md p-2.5 bg-gray-50 border border-gray-100">
            <Bone className="h-3 w-16 mb-2" />
            <Bone className="h-6 w-10" />
          </div>
        ))}
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 flex flex-wrap items-center gap-3">
        <Bone className="h-4 w-20" />
        <Bone className="h-3 w-40" />
        <Bone className="h-3 w-24 ml-auto" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-8 w-28" />
        ))}
      </div>
    </div>
  );
}

export function SettingsAcademicSkeleton() {
  return (
    <div className="space-y-4 text-sm">
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <Bone className="h-4 w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <Bone className="h-4 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-3 border border-gray-200 rounded-md space-y-2">
            <Bone className="h-4 w-24" />
            <Bone className="h-3 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsUsersTableSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} className="h-3 w-16" />
        ))}
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-3 py-3 flex items-center gap-4">
            <Bone className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-32" />
              <Bone className="h-3 w-44" />
            </div>
            <Bone className="h-6 w-16 rounded-full" />
            <Bone className="h-3 w-20" />
            <Bone className="h-6 w-14 rounded-full" />
            <Bone className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsSystemSkeleton() {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <Bone className="h-5 w-32" />
        <Bone className="h-8 w-28" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <Bone className="h-4 w-36" />
            {Array.from({ length: 4 }).map((_, j) => (
              <Bone key={j} className="h-9 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPerformanceSkeleton() {
  return (
    <div className="space-y-4 text-sm">
      <Bone className="h-5 w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            <Bone className="h-3 w-24" />
            <Bone className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <Bone className="h-4 w-32" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Bone className="h-3 w-24" />
              <Bone className="h-3 w-10" />
            </div>
            <Bone className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsFeesSkeleton() {
  return (
    <div className="space-y-4 text-sm">
      <Bone className="h-5 w-36" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-full" />
            <Bone className="h-8 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsGenericSkeleton() {
  return (
    <div className="space-y-4 text-sm">
      <Bone className="h-5 w-40" />
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <Bone className="h-4 w-48" />
        <Bone className="h-3 w-full max-w-md" />
        <div className="flex gap-2 pt-1">
          <Bone className="h-8 w-28" />
          <Bone className="h-8 w-28" />
        </div>
      </div>
    </div>
  );
}

export function SettingsPageSkeleton({ tab }: { tab: string }) {
  switch (tab) {
    case 'overview':
      return <SettingsOverviewSkeleton />;
    case 'academic':
      return <SettingsAcademicSkeleton />;
    case 'users':
      return <SettingsUsersTableSkeleton />;
    case 'system':
      return <SettingsSystemSkeleton />;
    case 'performance':
      return <SettingsPerformanceSkeleton />;
    case 'fees':
      return <SettingsFeesSkeleton />;
    default:
      return <SettingsGenericSkeleton />;
  }
}
