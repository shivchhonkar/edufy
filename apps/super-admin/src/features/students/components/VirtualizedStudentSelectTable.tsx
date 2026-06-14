'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Student } from '@/shared/types';
import { studentFullName, studentInitials } from '@/features/students/utils/student-profile';
import { FiCheckSquare, FiSquare } from 'react-icons/fi';

const ROW_HEIGHT = 56;
const OVERSCAN = 10;

const GRID_COLUMNS =
  '2.75rem minmax(7rem,0.9fr) minmax(12rem,1.8fr) minmax(6rem,0.9fr) minmax(5rem,0.7fr)';

interface VirtualizedStudentSelectTableProps {
  students: Student[];
  selectedIds: Set<number>;
  onToggle: (studentId: number) => void;
  onToggleAll: (studentIds: number[], select: boolean) => void;
}

export default function VirtualizedStudentSelectTable({
  students,
  selectedIds,
  onToggle,
  onToggleAll,
}: VirtualizedStudentSelectTableProps) {
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

  const allSelected =
    students.length > 0 && students.every((s) => selectedIds.has(s.id));
  const someSelected = students.some((s) => selectedIds.has(s.id));

  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    if (students.length === 0) {
      return { startIndex: 0, endIndex: -1, totalHeight: 0, offsetY: 0 };
    }

    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(students.length - 1, start + visibleCount - 1);

    return {
      startIndex: start,
      endIndex: end,
      totalHeight: students.length * ROW_HEIGHT,
      offsetY: start * ROW_HEIGHT,
    };
  }, [scrollTop, containerHeight, students.length]);

  const visibleStudents = useMemo(() => {
    if (endIndex < startIndex) return [];
    return students.slice(startIndex, endIndex + 1);
  }, [students, startIndex, endIndex]);

  if (students.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-gray-500">
        No students match your filters.
      </div>
    );
  }

  return (
    <div>
      <div
        className="grid items-center bg-gray-50 border-b"
        style={{ gridTemplateColumns: GRID_COLUMNS }}
      >
        <button
          type="button"
          onClick={() =>
            onToggleAll(
              students.map((s) => s.id),
              !allSelected
            )
          }
          className="px-3 py-3 flex items-center justify-center text-gray-600 hover:text-primary-600"
          title={allSelected ? 'Deselect all' : 'Select all'}
        >
          {allSelected ? <FiCheckSquare size={18} /> : <FiSquare size={18} />}
        </button>
        <HeaderCell>Admission No.</HeaderCell>
        <HeaderCell>Name</HeaderCell>
        <HeaderCell>Class</HeaderCell>
        <HeaderCell>Roll</HeaderCell>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-auto max-h-[calc(100vh-320px)]"
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
            {visibleStudents.map((student) => (
              <SelectRow
                key={student.id}
                student={student}
                selected={selectedIds.has(student.id)}
                onToggle={onToggle}
                style={{ height: ROW_HEIGHT }}
              />
            ))}
          </div>
        </div>
      </div>

      {someSelected && !allSelected && (
        <p className="px-4 py-2 text-xs text-gray-500 border-t bg-gray-50">
          {selectedIds.size} selected · use header checkbox to select all {students.length} loaded
        </p>
      )}
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      {children}
    </div>
  );
}

function SelectRow({
  student,
  selected,
  onToggle,
  style,
}: {
  student: Student;
  selected: boolean;
  onToggle: (id: number) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`grid items-center border-b cursor-pointer transition-colors ${
        selected ? 'bg-primary-50/60 hover:bg-primary-50' : 'bg-white hover:bg-gray-50'
      }`}
      style={{ gridTemplateColumns: GRID_COLUMNS, ...style }}
      onClick={() => onToggle(student.id)}
      onKeyDown={(e) => e.key === 'Enter' && onToggle(student.id)}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
    >
      <div className="px-3 flex items-center justify-center">
        {selected ? (
          <FiCheckSquare className="text-primary-600" size={18} />
        ) : (
          <FiSquare className="text-gray-400" size={18} />
        )}
      </div>
      <div className="px-4 text-sm font-medium text-gray-900 truncate">
        {student.admission_number}
      </div>
      <div className="px-4 flex items-center gap-2 min-w-0">
        {student.photo_url ? (
          <img
            src={student.photo_url}
            alt=""
            className="h-8 w-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-xs font-medium text-gray-600">
            {studentInitials(student)}
          </div>
        )}
        <span className="text-sm text-gray-900 truncate">{studentFullName(student)}</span>
      </div>
      <div className="px-4 text-sm text-gray-500 truncate">
        {student.class_name || '—'}
        {student.section_name ? ` · ${student.section_name}` : ''}
      </div>
      <div className="px-4 text-sm text-gray-500">{student.roll_number || '—'}</div>
    </div>
  );
}
