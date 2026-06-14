'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BULK_EDIT_COLUMNS,
  BULK_EDIT_TOTAL_WIDTH,
  buildSectionsByClassId,
  BulkEditClassOption,
  BulkEditColumn,
  BulkEditRow,
  BulkEditSectionOption,
} from '@/features/students/utils/bulk-edit';

const ROW_HEIGHT = 34;
const OVERSCAN = 12;

interface BulkEditSpreadsheetProps {
  rows: BulkEditRow[];
  rowIndices: number[];
  changedRowIds: Set<number>;
  classes: BulkEditClassOption[];
  allSections: BulkEditSectionOption[];
  onCellChange: (rowIndex: number, key: keyof BulkEditRow, value: string) => void;
}

export default function BulkEditSpreadsheet({
  rows,
  rowIndices,
  changedRowIds,
  classes,
  allSections,
  onCellChange,
}: BulkEditSpreadsheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const classNames = useMemo(() => classes.map((cls) => cls.name), [classes]);

  const classNameToId = useMemo(
    () => new Map(classes.map((cls) => [cls.name.toLowerCase(), cls.id])),
    [classes]
  );

  const sectionsByClassId = useMemo(
    () => buildSectionsByClassId(classes, allSections),
    [classes, allSections]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateHeight = () => setContainerHeight(element.clientHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    const count = rowIndices.length;
    if (count === 0) {
      return { startIndex: 0, endIndex: -1, totalHeight: 0, offsetY: 0 };
    }

    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(count - 1, start + visibleCount - 1);

    return {
      startIndex: start,
      endIndex: end,
      totalHeight: count * ROW_HEIGHT,
      offsetY: start * ROW_HEIGHT,
    };
  }, [scrollTop, containerHeight, rowIndices.length]);

  const visibleRowIndices = useMemo(() => {
    if (endIndex < startIndex) return [];
    return rowIndices.slice(startIndex, endIndex + 1);
  }, [rowIndices, startIndex, endIndex]);

  if (rowIndices.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 text-sm text-gray-500">
        No students match your filters.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-auto bg-white"
    >
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

        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${offsetY}px)`,
            }}
          >
            {visibleRowIndices.map((rowIndex, visibleIndex) => {
              const row = rows[rowIndex];
              if (!row) return null;
              const displayNumber = startIndex + visibleIndex + 1;
              const isChanged = changedRowIds.has(row.id);

              return (
                <div
                  key={row.id}
                  className={`flex border-b border-gray-200 ${isChanged ? 'bg-amber-50' : 'bg-white hover:bg-gray-50'}`}
                  style={{ height: ROW_HEIGHT }}
                >
                  {BULK_EDIT_COLUMNS.map((column) => (
                    <SpreadsheetCell
                      key={`${row.id}-${column.key}`}
                      column={column}
                      row={row}
                      displayNumber={displayNumber}
                      classNames={classNames}
                      classNameToId={classNameToId}
                      sectionsByClassId={sectionsByClassId}
                      onChange={(key, value) => onCellChange(rowIndex, key, value)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SpreadsheetCellProps {
  column: BulkEditColumn;
  row: BulkEditRow;
  displayNumber: number;
  classNames: string[];
  classNameToId: Map<string, number>;
  sectionsByClassId: Map<number, string[]>;
  onChange: (key: keyof BulkEditRow, value: string) => void;
}

function SpreadsheetCell({
  column,
  row,
  displayNumber,
  classNames,
  classNameToId,
  sectionsByClassId,
  onChange,
}: SpreadsheetCellProps) {
  const baseClass =
    'shrink-0 border-r border-gray-200 last:border-r-0 h-full flex items-center text-xs text-gray-900';

  if (column.key === 'row_number') {
    return (
      <div className={`${baseClass} px-2 text-gray-500 bg-gray-50`} style={{ width: column.width }}>
        {displayNumber}
      </div>
    );
  }

  if (column.readOnly) {
    return (
      <div className={`${baseClass} px-2 bg-gray-50 font-medium`} style={{ width: column.width }}>
        {row[column.key as keyof BulkEditRow]}
      </div>
    );
  }

  const fieldKey = column.key as keyof BulkEditRow;
  const value = row[fieldKey] ?? '';

  if (column.key === 'class_name') {
    const options = [...classNames];
    if (value && !options.includes(value)) {
      options.push(value);
    }

    return (
      <div className={baseClass} style={{ width: column.width }}>
        <select
          value={value}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="w-full h-full px-1.5 border-0 bg-transparent focus:ring-1 focus:ring-primary-500 focus:bg-white text-xs"
        >
          <option value="">—</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (column.key === 'section_name') {
    const classId = row.class_name
      ? classNameToId.get(row.class_name.toLowerCase())
      : undefined;
    const sectionOptions = classId ? sectionsByClassId.get(classId) ?? [] : [];
    const options = [...sectionOptions];
    if (value && !options.includes(value)) {
      options.push(value);
    }

    return (
      <div className={baseClass} style={{ width: column.width }}>
        <select
          value={value}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          disabled={!row.class_name}
          className="w-full h-full px-1.5 border-0 bg-transparent focus:ring-1 focus:ring-primary-500 focus:bg-white text-xs disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option value="">{row.class_name ? '—' : 'Select class first'}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (column.type === 'select' && column.options) {
    return (
      <div className={baseClass} style={{ width: column.width }}>
        <select
          value={value}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="w-full h-full px-1.5 border-0 bg-transparent focus:ring-1 focus:ring-primary-500 focus:bg-white text-xs"
        >
          {column.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={baseClass} style={{ width: column.width }}>
      <input
        type={column.type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="w-full h-full px-1.5 border-0 bg-transparent focus:ring-1 focus:ring-primary-500 focus:bg-white text-xs"
      />
    </div>
  );
}
