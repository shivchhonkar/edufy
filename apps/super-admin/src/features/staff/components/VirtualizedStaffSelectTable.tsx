'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiCheckSquare, FiSquare } from 'react-icons/fi';
import type { StaffListItem } from '@/features/staff/components/VirtualizedStaffTable';

const ROW_HEIGHT = 56;
const OVERSCAN = 10;

const GRID_COLUMNS = '2.75rem minmax(6rem,0.8fr) minmax(14rem,2fr) minmax(8rem,1fr)';

interface VirtualizedStaffSelectTableProps {
  staff: StaffListItem[];
  selectedIds: Set<number>;
  onToggle: (staffId: number) => void;
  onToggleAll: (staffIds: number[], select: boolean) => void;
}

function staffDisplayName(member: StaffListItem) {
  return `${member.first_name} ${member.last_name}`.trim();
}

export default function VirtualizedStaffSelectTable({
  staff,
  selectedIds,
  onToggle,
  onToggleAll,
}: VirtualizedStaffSelectTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

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

  const allSelected = staff.length > 0 && staff.every((s) => selectedIds.has(s.id));

  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    if (staff.length === 0) {
      return { startIndex: 0, endIndex: -1, totalHeight: 0, offsetY: 0 };
    }

    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(staff.length - 1, start + visibleCount - 1);

    return {
      startIndex: start,
      endIndex: end,
      totalHeight: staff.length * ROW_HEIGHT,
      offsetY: start * ROW_HEIGHT,
    };
  }, [scrollTop, containerHeight, staff.length]);

  const visibleStaff = useMemo(() => {
    if (endIndex < startIndex) return [];
    return staff.slice(startIndex, endIndex + 1);
  }, [staff, startIndex, endIndex]);

  if (staff.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-gray-500">No staff members match your filters.</div>
    );
  }

  return (
    <div>
      <div
        className="grid w-full min-w-0 items-center border-b bg-gray-50"
        style={{ gridTemplateColumns: GRID_COLUMNS }}
      >
        <button
          type="button"
          onClick={() => onToggleAll(staff.map((s) => s.id), !allSelected)}
          className="flex items-center justify-center px-3 py-3 text-gray-600 hover:text-primary-600"
          title={allSelected ? 'Deselect all' : 'Select all'}
        >
          {allSelected ? <FiCheckSquare size={18} /> : <FiSquare size={18} />}
        </button>
        <div className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
          Employee ID
        </div>
        <div className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
          Name
        </div>
        <div className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
          Department
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-[calc(100vh-320px)] overflow-auto"
      >
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
            {visibleStaff.map((member) => (
              <div
                key={member.id}
                className="grid w-full min-w-0 items-center border-b border-gray-200 hover:bg-gray-50"
                style={{ gridTemplateColumns: GRID_COLUMNS, height: ROW_HEIGHT }}
              >
                <div className="flex items-center justify-center px-3">
                  <button
                    type="button"
                    onClick={() => onToggle(member.id)}
                    className="text-gray-600 hover:text-primary-600"
                    aria-label={selectedIds.has(member.id) ? 'Deselect' : 'Select'}
                  >
                    {selectedIds.has(member.id) ? (
                      <FiCheckSquare className="text-primary-600" size={18} />
                    ) : (
                      <FiSquare className="text-gray-400" size={18} />
                    )}
                  </button>
                </div>
                <div className="px-4 text-sm font-medium text-gray-900">{member.employee_id}</div>
                <div className="px-4 text-sm text-gray-900">{staffDisplayName(member)}</div>
                <div className="px-4 text-sm text-gray-500">
                  {member.department_name || member.department || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
