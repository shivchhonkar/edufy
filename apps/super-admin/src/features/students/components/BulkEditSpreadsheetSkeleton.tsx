'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BULK_EDIT_COLUMNS,
  BULK_EDIT_ROW_HEIGHT,
  BULK_EDIT_TOTAL_WIDTH,
  BulkEditColumn,
} from '@/features/students/utils/bulk-edit';

const MIN_SKELETON_ROWS = 8;

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/90 ${className}`} aria-hidden="true" />;
}

function SkeletonCell({ column }: { column: BulkEditColumn }) {
  const baseClass = 'shrink-0 px-2 flex items-center border-r border-gray-200 last:border-r-0 h-full';

  if (column.key === 'row_number') {
    return (
      <div className={`${baseClass} bg-gray-50`} style={{ width: column.width }}>
        <SkeletonBlock className="h-2.5 w-4" />
      </div>
    );
  }

  if (column.readOnly) {
    return (
      <div className={`${baseClass} bg-gray-50`} style={{ width: column.width }}>
        <SkeletonBlock className="h-2.5 w-12" />
      </div>
    );
  }

  if (column.type === 'date') {
    return (
      <div className={baseClass} style={{ width: column.width }}>
        <SkeletonBlock className="h-3 w-[calc(100%-1.25rem)] max-w-[5.5rem]" />
      </div>
    );
  }

  if (column.type === 'select') {
    return (
      <div className={baseClass} style={{ width: column.width }}>
        <SkeletonBlock className="h-3 w-[calc(100%-0.75rem)] max-w-[4.5rem]" />
      </div>
    );
  }

  return (
    <div className={baseClass} style={{ width: column.width }}>
      <SkeletonBlock className="h-3 w-[70%] max-w-full" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      className="flex border-b border-gray-200 bg-white"
      style={{ height: BULK_EDIT_ROW_HEIGHT }}
    >
      {BULK_EDIT_COLUMNS.map((column) => (
        <SkeletonCell key={column.key} column={column} />
      ))}
    </div>
  );
}

export function BulkEditTotalSkeleton() {
  return <SkeletonBlock className="inline-block h-3.5 w-20 align-middle" />;
}

export default function BulkEditSpreadsheetSkeleton() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [rowCount, setRowCount] = useState(MIN_SKELETON_ROWS);

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;

    const updateRowCount = () => {
      const availableHeight = element.clientHeight;
      setRowCount(
        Math.max(MIN_SKELETON_ROWS, Math.ceil(availableHeight / BULK_EDIT_ROW_HEIGHT)),
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
      aria-label="Loading students for bulk edit"
      className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white"
    >
      <div ref={bodyRef} className="flex-1 min-h-0 overflow-auto">
        <div style={{ minWidth: BULK_EDIT_TOTAL_WIDTH }}>
          <div className="sticky top-0 z-20 flex bg-gray-100 border-b border-gray-300">
            {BULK_EDIT_COLUMNS.map((column) => (
              <div
                key={column.key}
                className="shrink-0 px-2 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide border-r border-gray-300 last:border-r-0"
                style={{ width: column.width }}
              >
                {column.label}
              </div>
            ))}
          </div>

          {Array.from({ length: rowCount }, (_, index) => (
            <SkeletonRow key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
