'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Student } from '@/shared/types';
import { studentFullName, studentInitials, getStudentContactPhone } from '@/features/students/utils/student-profile';
import { FiCheckSquare, FiEdit, FiSquare, FiTrash, FiEye } from 'react-icons/fi';
import StudentRowMoreActions from '@/features/students/components/StudentRowMoreActions';
import { AdmissionNo } from '@/shared/context/AdmissionNumberFormatContext';

const ROW_HEIGHT = 60;
const OVERSCAN = 12;

const ACTIONS_COLUMN = 'minmax(7.5rem, 0.95fr)';

export const STUDENTS_TABLE_ROW_HEIGHT = ROW_HEIGHT;
export const STUDENTS_TABLE_GRID_COLUMNS = `minmax(6.5rem, 0.85fr) minmax(11rem, 2fr) minmax(5rem, 0.75fr) minmax(3.5rem, 0.5fr) minmax(4rem, 0.6fr) ${ACTIONS_COLUMN}`;

const GRID_COLUMNS = STUDENTS_TABLE_GRID_COLUMNS;

const GRID_COLUMNS_WITH_SELECT = `2.25rem minmax(6.5rem, 0.85fr) minmax(11rem, 2fr) minmax(5rem, 0.75fr) minmax(3.5rem, 0.5fr) minmax(4rem, 0.6fr) ${ACTIONS_COLUMN}`;

interface VirtualizedStudentsTableProps {
  students: Student[];
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onGenerateTc?: (student: Student) => void;
  onGatePass?: (student: Student) => void;
  onIdCard?: (student: Student) => void;
  selectedIds?: Set<number>;
  onToggleSelect?: (studentId: number) => void;
  onToggleSelectAll?: (studentIds: number[], select: boolean) => void;
}

export default function VirtualizedStudentsTable({
  students,
  onView,
  onEdit,
  onDelete,
  onGenerateTc,
  onGatePass,
  onIdCard,
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
      <div className="px-4 py-8 text-center text-sm text-gray-500">
        No students found. Click &quot;Add Student&quot; to get started.
      </div>
    );
  }

  return (
    <div>
      <div
        className="grid w-full min-w-0 items-center bg-gray-50 border-b"
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
            className="px-2 py-2 flex items-center justify-center text-gray-600 hover:text-primary-600"
            title={allSelected ? 'Deselect all' : 'Select all'}
          >
            {allSelected ? <FiCheckSquare size={15} /> : <FiSquare size={15} />}
          </button>
        )}
        <HeaderCell>Admission</HeaderCell>
        <HeaderCell>Student</HeaderCell>
        <HeaderCell>Class</HeaderCell>
        <HeaderCell>Gender</HeaderCell>
        <HeaderCell>Status</HeaderCell>
        <HeaderCell className="pr-3">Actions</HeaderCell>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-auto max-h-[calc(100vh-180px)]"
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
                onGenerateTc={onGenerateTc}
                onGatePass={onGatePass}
                onIdCard={onIdCard}
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
        <p className="px-3 py-1.5 text-xs text-gray-500 border-t bg-gray-50">
          {selectedIds!.size} selected · use header checkbox to select all {students.length} loaded
        </p>
      )}
    </div>
  );
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

interface StudentRowProps {
  student: Student;
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onGenerateTc?: (student: Student) => void;
  onGatePass?: (student: Student) => void;
  onIdCard?: (student: Student) => void;
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
  onGenerateTc,
  onGatePass,
  onIdCard,
  selected = false,
  onToggleSelect,
  gridColumns,
  style,
}: StudentRowProps) {
  const contactPhone = getStudentContactPhone(student);
  const classLabel = student.class_name
    ? [student.class_name, student.section_name].filter(Boolean).join('-')
    : '—';

  return (
    <div
      className={`grid w-full min-w-0 items-center border-b border-gray-100 hover:bg-gray-50 ${
        selected ? 'bg-primary-50/60' : 'bg-white'
      }`}
      style={{ gridTemplateColumns: gridColumns, ...style }}
    >
      {onToggleSelect && (
        <div className="px-2 flex items-center justify-center">
          <button
            type="button"
            onClick={() => onToggleSelect(student.id)}
            className="text-gray-600 hover:text-primary-600"
            aria-label={selected ? 'Deselect student' : 'Select student'}
          >
            {selected ? (
              <FiCheckSquare className="text-primary-600" size={15} />
            ) : (
              <FiSquare className="text-gray-400" size={15} />
            )}
          </button>
        </div>
      )}

      <div className="px-3 py-2 min-w-0">
        <div className="truncate text-xs font-medium text-gray-900 leading-snug">
          <AdmissionNo value={student.admission_number} />
        </div>
        <div className="truncate text-[11px] text-gray-500 leading-snug mt-0.5">
          Roll {student.roll_number || '—'}
        </div>
      </div>

      <div className="px-3 py-2 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={studentFullName(student)}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-[10px] font-medium text-gray-600">
                {studentInitials(student)}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-gray-900 leading-snug">
              {studentFullName(student)}
            </div>
            <div className="truncate text-[11px] text-gray-500 leading-snug mt-0.5">{contactPhone || '—'}</div>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 truncate text-xs text-gray-700">{classLabel}</div>

      <div className="px-3 py-2 truncate text-xs text-gray-500 capitalize">
        {student.gender || '—'}
      </div>

      <div className="px-3 py-2">
        <span
          className={`px-1.5 py-0.5 inline-flex text-[10px] font-medium rounded ${
            student.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {student.status}
        </span>
      </div>

      <div className="flex h-full min-w-0 items-center justify-end gap-0 pl-2 pr-3">
        <button
          type="button"
          onClick={() => onView(student)}
          className="inline-flex shrink-0 items-center justify-center p-1 text-primary-600 hover:text-primary-900"
          title="View Details"
        >
          <FiEye size={15} />
        </button>
        <button
          type="button"
          onClick={() => onEdit(student)}
          className="inline-flex shrink-0 items-center justify-center p-1 text-blue-600 hover:text-blue-900"
          title="Edit"
        >
          <FiEdit size={15} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(student)}
          className="inline-flex shrink-0 items-center justify-center p-1 text-red-600 hover:text-red-900"
          title="Delete"
        >
          <FiTrash size={15} />
        </button>
        <StudentRowMoreActions
          student={student}
          onGenerateTc={onGenerateTc}
          onGatePass={onGatePass}
          onIdCard={onIdCard}
          compact
        />
      </div>
    </div>
  );
}
