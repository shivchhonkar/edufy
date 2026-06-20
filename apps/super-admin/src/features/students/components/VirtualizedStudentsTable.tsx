'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Student } from '@/shared/types';
import { studentFullName, studentInitials } from '@/features/students/utils/student-profile';
import { FiCheckSquare, FiEdit, FiSquare, FiTrash, FiEye } from 'react-icons/fi';
import StudentRowMoreActions from '@/features/students/components/StudentRowMoreActions';

const ROW_HEIGHT = 73;
const OVERSCAN = 10;

const GRID_COLUMNS =
  'minmax(7rem,0.9fr) minmax(14rem,2fr) minmax(6rem,0.9fr) minmax(5rem,0.7fr) minmax(7rem,0.9fr) minmax(5.5rem,0.7fr) minmax(7rem,0.9fr)';

const GRID_COLUMNS_WITH_SELECT =
  '2.75rem minmax(7rem,0.9fr) minmax(14rem,2fr) minmax(6rem,0.9fr) minmax(5rem,0.7fr) minmax(7rem,0.9fr) minmax(5.5rem,0.7fr) minmax(7rem,0.9fr)';

interface VirtualizedStudentsTableProps {
  students: Student[];
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  selectedIds?: Set<number>;
  onToggleSelect?: (studentId: number) => void;
  onToggleSelectAll?: (studentIds: number[], select: boolean) => void;
}

export default function VirtualizedStudentsTable({
  students,
  onView,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: VirtualizedStudentsTableProps) {
  const selectionEnabled = Boolean(selectedIds && onToggleSelect && onToggleSelectAll);
  const gridColumns = selectionEnabled ? GRID_COLUMNS_WITH_SELECT : GRID_COLUMNS;
  const allSelected =
    selectionEnabled &&
    students.length > 0 &&
    students.every((s) => selectedIds!.has(s.id));
  const someSelected = selectionEnabled && students.some((s) => selectedIds!.has(s.id));
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
        No students found. Click &quot;Add Student&quot; to get started.
      </div>
    );
  }

  return (
    <div>
      <div
        className="grid items-center bg-gray-50 border-b"
        style={{ gridTemplateColumns: gridColumns }}
      >
        {selectionEnabled && (
          <button
            type="button"
            onClick={() =>
              onToggleSelectAll!(
                students.map((s) => s.id),
                !allSelected
              )
            }
            className="px-3 py-3 flex items-center justify-center text-gray-600 hover:text-primary-600"
            title={allSelected ? 'Deselect all' : 'Select all'}
          >
            {allSelected ? <FiCheckSquare size={18} /> : <FiSquare size={18} />}
          </button>
        )}
        <HeaderCell>Admission No.</HeaderCell>
        <HeaderCell>Name</HeaderCell>
        <HeaderCell>Class</HeaderCell>
        <HeaderCell>Gender</HeaderCell>
        <HeaderCell>Contact</HeaderCell>
        <HeaderCell>Status</HeaderCell>
        <HeaderCell>Actions</HeaderCell>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-auto max-h-[calc(100vh-240px)]"
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
              <StudentRow
                key={student.id}
                student={student}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                selected={selectionEnabled ? selectedIds!.has(student.id) : false}
                onToggleSelect={onToggleSelect}
                gridColumns={gridColumns}
                style={{ height: ROW_HEIGHT }}
              />
            ))}
          </div>
        </div>
      </div>

      {selectionEnabled && someSelected && !allSelected && (
        <p className="px-4 py-2 text-xs text-gray-500 border-t bg-gray-50">
          {selectedIds!.size} selected · use header checkbox to select all {students.length} loaded
        </p>
      )}
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      {children}
    </div>
  );
}

interface StudentRowProps {
  student: Student;
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  selected?: boolean;
  onToggleSelect?: (studentId: number) => void;
  gridColumns: string;
  style?: React.CSSProperties;
}

function StudentRow({
  student,
  onView,
  onEdit,
  onDelete,
  selected = false,
  onToggleSelect,
  gridColumns,
  style,
}: StudentRowProps) {
  return (
    <div
      className={`grid items-center border-b border-gray-200 hover:bg-gray-50 ${
        selected ? 'bg-primary-50/60' : 'bg-white'
      }`}
      style={{ gridTemplateColumns: gridColumns, ...style }}
    >
      {onToggleSelect && (
        <div className="px-3 flex items-center justify-center">
          <button
            type="button"
            onClick={() => onToggleSelect(student.id)}
            className="text-gray-600 hover:text-primary-600"
            aria-label={selected ? 'Deselect student' : 'Select student'}
          >
            {selected ? (
              <FiCheckSquare className="text-primary-600" size={18} />
            ) : (
              <FiSquare className="text-gray-400" size={18} />
            )}
          </button>
        </div>
      )}
      <div className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {student.admission_number}
      </div>

      <div className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={studentFullName(student)}
              className="h-10 w-10 rounded-full object-cover mr-3"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
              <span className="text-sm font-medium text-gray-600">
                {studentInitials(student)}
              </span>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">{studentFullName(student)}</div>
            <div className="text-sm text-gray-500">{student.parent_phone}</div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {student.class_name || 'Not Assigned'}
      </div>

      <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.gender}</div>

      <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {student.parent_phone}
      </div>

      <div className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
            student.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {student.status}
        </span>
      </div>

      <div className="px-4 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView(student)}
            className="text-primary-600 hover:text-primary-900 p-1"
            title="View Details"
          >
            <FiEye size={18} />
          </button>
          <button
            onClick={() => onEdit(student)}
            className="text-blue-600 hover:text-blue-900 p-1"
            title="Edit"
          >
            <FiEdit size={18} />
          </button>
          <button
            onClick={() => onDelete(student)}
            className="text-red-600 hover:text-red-900 p-1"
            title="Delete"
          >
            <FiTrash size={18} />
          </button>
          <StudentRowMoreActions student={student} />
        </div>
      </div>
    </div>
  );
}
