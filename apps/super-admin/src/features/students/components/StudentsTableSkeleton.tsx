'use client';

import { useEffect, useRef, useState } from 'react';
import {
  STUDENTS_TABLE_GRID_COLUMNS,
  STUDENTS_TABLE_ROW_HEIGHT,
} from '@/features/students/components/VirtualizedStudentsTable';

const MIN_SKELETON_ROWS = 6;
const TABLE_VIEWPORT_HEIGHT = 'calc(100vh - 180px)';

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
      className={`px-3 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide ${className}`}
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
        gridTemplateColumns: STUDENTS_TABLE_GRID_COLUMNS,
        height: STUDENTS_TABLE_ROW_HEIGHT,
      }}
    >
      <div className="space-y-1.5 px-3 py-2">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-2.5 w-14" />
      </div>

      <div className="flex items-center gap-2.5 px-3 py-2 min-w-0">
        <SkeletonBlock className="h-8 w-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <SkeletonBlock className="h-3.5 w-32 max-w-full" />
          <SkeletonBlock className="h-2.5 w-24 max-w-full" />
        </div>
      </div>

      <div className="px-3 py-2">
        <SkeletonBlock className="h-3 w-20" />
      </div>

      <div className="px-3 py-2">
        <SkeletonBlock className="h-3 w-10" />
      </div>

      <div className="px-3 py-2">
        <SkeletonBlock className="h-5 w-14 rounded-full" />
      </div>

      <div className="flex items-center justify-end gap-1.5 pl-2 pr-3">
        <SkeletonBlock className="h-4 w-4 rounded" />
        <SkeletonBlock className="h-4 w-4 rounded" />
        <SkeletonBlock className="h-4 w-4 rounded" />
        <SkeletonBlock className="h-4 w-4 rounded" />
      </div>
    </div>
  );
}

export function StudentsTotalSkeleton() {
  return <SkeletonBlock className="inline-block h-3 w-16 align-middle" />;
}

export default function StudentsTableSkeleton() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [rowCount, setRowCount] = useState(MIN_SKELETON_ROWS);

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;

    const updateRowCount = () => {
      const availableHeight = element.clientHeight;
      setRowCount(
        Math.max(MIN_SKELETON_ROWS, Math.ceil(availableHeight / STUDENTS_TABLE_ROW_HEIGHT)),
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
      aria-label="Loading students"
      className="flex flex-col overflow-hidden"
      style={{ minHeight: TABLE_VIEWPORT_HEIGHT, maxHeight: TABLE_VIEWPORT_HEIGHT }}
    >
      <div
        className="grid w-full min-w-0 shrink-0 items-center bg-gray-50 border-b"
        style={{ gridTemplateColumns: STUDENTS_TABLE_GRID_COLUMNS }}
      >
        <HeaderCell>Admission</HeaderCell>
        <HeaderCell>Student</HeaderCell>
        <HeaderCell>Class</HeaderCell>
        <HeaderCell>Gender</HeaderCell>
        <HeaderCell>Status</HeaderCell>
        <HeaderCell className="pr-3">Actions</HeaderCell>
      </div>

      <div ref={bodyRef} className="flex-1 min-h-0 overflow-hidden">
        {Array.from({ length: rowCount }, (_, index) => (
          <SkeletonRow key={index} />
        ))}
      </div>
    </div>
  );
}
