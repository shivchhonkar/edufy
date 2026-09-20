'use client';

const BONE = 'animate-pulse bg-gray-200 rounded-md';

export default function FeeSetupSkeleton() {
  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div className={`${BONE} h-7 w-32`} />
        <div className={`${BONE} h-9 w-28`} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`${BONE} h-8 w-8 rounded-full`} />
          <div className={`${BONE} h-5 w-64`} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={`${BONE} h-10 w-full`} />
          <div className={`${BONE} h-10 w-full`} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className={`${BONE} h-5 w-40`} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${BONE} h-28 w-full rounded-xl`} />
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className={`${BONE} h-5 w-48`} />
          <div className={`${BONE} h-9 w-full`} />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`${BONE} h-8 w-24`} />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${BONE} h-12 w-full`} />
          ))}
        </div>
        <div className="space-y-4">
          <div className={`${BONE} h-48 w-full rounded-xl`} />
          <div className={`${BONE} h-36 w-full rounded-xl`} />
        </div>
      </div>
    </div>
  );
}
