'use client';

import { useEffect, useRef, useState } from 'react';

export const TEACHERS_TABLE_ROW_HEIGHT = 64;
export const TEACHERS_TABLE_MIN_WIDTH = 960;
export const TEACHERS_TABLE_MAX_HEIGHT = 'calc(100dvh - 18rem)';
export const TEACHERS_TABLE_GRID_COLUMNS =
  '3.5rem minmax(11rem, 1.6fr) 7rem minmax(9rem, 1.2fr) minmax(8rem, 1fr) 5rem 6rem 7rem';

const MIN_SKELETON_ROWS = 6;

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/90 ${className}`} aria-hidden="true" />;
}

function HeaderCell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-4 py-3 text-xs font-semibold uppercase text-gray-500 whitespace-nowrap ${className}`}
    >
      {children}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      className="grid w-full min-w-0 items-center border-b border-gray-100 bg-white"
      style={{
        gridTemplateColumns: TEACHERS_TABLE_GRID_COLUMNS,
        height: TEACHERS_TABLE_ROW_HEIGHT,
      }}
    >
      <div className="px-4 py-3">
        <SkeletonBlock className="h-3.5 w-4" />
      </div>

      <div className="space-y-1.5 px-4 py-3 min-w-0">
        <SkeletonBlock className="h-3.5 w-32 max-w-full" />
        <SkeletonBlock className="h-2.5 w-20 max-w-full" />
      </div>

      <div className="px-4 py-3">
        <SkeletonBlock className="h-3.5 w-20" />
      </div>

      <div className="space-y-1.5 px-4 py-3 min-w-0">
        <SkeletonBlock className="h-3.5 w-24 max-w-full" />
        <SkeletonBlock className="h-2.5 w-36 max-w-full" />
      </div>

      <div className="px-4 py-3">
        <SkeletonBlock className="h-3.5 w-28" />
      </div>

      <div className="px-4 py-3">
        <SkeletonBlock className="h-3.5 w-6" />
      </div>

      <div className="px-4 py-3">
        <SkeletonBlock className="h-5 w-14 rounded-full" />
      </div>

      <div className="flex items-center justify-end gap-1.5 px-4 py-3">
        <SkeletonBlock className="h-4 w-4 rounded" />
        <SkeletonBlock className="h-4 w-4 rounded" />
        <SkeletonBlock className="h-4 w-4 rounded" />
      </div>
    </div>
  );
}

export default function TeachersTableSkeleton({ fillHeight = false }: { fillHeight?: boolean }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [rowCount, setRowCount] = useState(MIN_SKELETON_ROWS);

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;

    const updateRowCount = () => {
      const availableHeight = element.clientHeight;
      setRowCount(
        Math.max(MIN_SKELETON_ROWS, Math.ceil(availableHeight / TEACHERS_TABLE_ROW_HEIGHT)),
      );
    };

    updateRowCount();
    const observer = new ResizeObserver(updateRowCount);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-busy="true"
      aria-label="Loading teachers"
      className={`flex flex-col overflow-x-auto ${fillHeight ? 'h-full min-h-0' : ''}`}
      style={{
        minWidth: TEACHERS_TABLE_MIN_WIDTH,
        ...(fillHeight
          ? undefined
          : { minHeight: TEACHERS_TABLE_MAX_HEIGHT, maxHeight: TEACHERS_TABLE_MAX_HEIGHT }),
      }}
    >
      <div
        className="grid w-full min-w-0 shrink-0 items-center border-b border-gray-200 bg-gray-50"
        style={{ gridTemplateColumns: TEACHERS_TABLE_GRID_COLUMNS }}
      >
        <HeaderCell>S.N.</HeaderCell>
        <HeaderCell>Teacher</HeaderCell>
        <HeaderCell>Employee ID</HeaderCell>
        <HeaderCell>Contact</HeaderCell>
        <HeaderCell>Qualification</HeaderCell>
        <HeaderCell>Assignments</HeaderCell>
        <HeaderCell>Status</HeaderCell>
        <HeaderCell className="text-right">Actions</HeaderCell>
      </div>

      <div ref={bodyRef} className="flex-1 min-h-0 overflow-hidden">
        {Array.from({ length: rowCount }, (_, index) => (
          <SkeletonRow key={index} />
        ))}
      </div>
    </div>
  );
}
