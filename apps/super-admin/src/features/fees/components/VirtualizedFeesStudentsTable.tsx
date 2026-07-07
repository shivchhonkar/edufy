'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiEye, FiMoreVertical } from 'react-icons/fi';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import { studentInitials } from '@/features/students/utils/student-profile';

const ROW_HEIGHT = 76;
const OVERSCAN = 12;

const GRID_COLUMNS =
  'minmax(12rem,1.6fr) minmax(9rem,1.15fr) minmax(8rem,0.95fr) minmax(8.5rem,0.95fr) minmax(7rem,0.75fr) minmax(14rem,1.55fr)';

export interface FeeStudentRow {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  parent_name?: string | null;
  class_id?: number | null;
  section_id?: number | null;
  class_name?: string | null;
  section_name?: string | null;
  parent_phone?: string | null;
  photo_url?: string | null;
  paymentStatus?: string;
  pendingAmount?: number;
}

interface VirtualizedFeesStudentsTableProps {
  students: FeeStudentRow[];
  formatCurrency: (amount: number | string | null | undefined) => string;
  onViewFees: (student: FeeStudentRow) => void;
  onRecordPayment: (student: FeeStudentRow) => void;
  hasActiveFilters?: boolean;
}

export default function VirtualizedFeesStudentsTable({
  students,
  formatCurrency,
  onViewFees,
  onRecordPayment,
  hasActiveFilters = false,
}: VirtualizedFeesStudentsTableProps) {
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
      <div className="px-4 py-12 text-center text-gray-500">
        <p className="text-base font-medium text-gray-700">No students found</p>
        <p className="text-sm mt-1">
          {hasActiveFilters
            ? 'Try adjusting your search or filters'
            : 'No students are currently enrolled'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="grid items-center bg-gray-50 border-b border-gray-200"
        style={{ gridTemplateColumns: GRID_COLUMNS }}
      >
        <HeaderCell>Student</HeaderCell>
        <HeaderCell>Parent / Guardian</HeaderCell>
        <HeaderCell>Class &amp; Section</HeaderCell>
        <HeaderCell>Outstanding</HeaderCell>
        <HeaderCell>Status</HeaderCell>
        <HeaderCell className="text-right">Actions</HeaderCell>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-auto max-h-[calc(100vh-420px)]"
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
                formatCurrency={formatCurrency}
                onViewFees={onViewFees}
                onRecordPayment={onRecordPayment}
                style={{ height: ROW_HEIGHT }}
              />
            ))}
          </div>
        </div>
      </div>
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
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide ${className}`}
    >
      {children}
    </div>
  );
}

interface StudentRowProps {
  student: FeeStudentRow;
  formatCurrency: (amount: number | string | null | undefined) => string;
  onViewFees: (student: FeeStudentRow) => void;
  onRecordPayment: (student: FeeStudentRow) => void;
  style?: React.CSSProperties;
}

function StudentRow({
  student,
  formatCurrency,
  onViewFees,
  onRecordPayment,
  style,
}: StudentRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const outstanding = getOutstandingDisplay(student, formatCurrency);
  const status = getStatusDisplay(student);

  return (
    <div
      className="grid items-center border-b border-gray-100 hover:bg-gray-50/80 bg-white"
      style={{ gridTemplateColumns: GRID_COLUMNS, ...style }}
    >
      <div className="px-4 py-2 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt=""
              className="h-9 w-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 text-xs font-semibold">
              {studentInitials(student)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {student.first_name} {student.last_name}
            </p>
            <p className="text-xs text-gray-500 truncate">{student.admission_number}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 overflow-hidden">
        <p className="text-sm font-medium text-gray-900 truncate">{student.parent_name || '—'}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{student.parent_phone || '—'}</p>
      </div>

      <div className="px-4 py-2 overflow-hidden">
        <p className="text-sm text-gray-900 truncate">{student.class_name || '—'}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {student.section_name ? `Section: ${student.section_name}` : 'Section: —'}
        </p>
      </div>

      <div className="px-4 py-2">{outstanding}</div>

      <div className="px-4 py-2">
        <span
          className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="px-4 py-2">
        <div className="flex justify-end items-center gap-1.5">
          <button
            type="button"
            onClick={() => onViewFees(student)}
            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-1 transition-colors text-xs font-medium whitespace-nowrap"
          >
            <FiEye size={14} />
            View & Collect Fees
          </button>
          {/* <button
            type="button"
            onClick={() => onRecordPayment(student)}
            className="px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center gap-1 transition-colors text-xs font-medium whitespace-nowrap"
          >
            <RupeeIcon size={14} />
            Record Payment
          </button> */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              aria-label="More actions"
            >
              <FiMoreVertical size={16} />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-xs">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setMenuOpen(false);
                      onViewFees(student);
                    }}
                  >
                    Open ledger
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setMenuOpen(false);
                      onRecordPayment(student);
                    }}
                  >
                    Collect payment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getOutstandingDisplay(
  student: FeeStudentRow,
  formatCurrency: (amount: number | string | null | undefined) => string,
) {
  if (student.paymentStatus === 'not_assigned') {
    return <span className="text-xs text-gray-400">—</span>;
  }

  if (student.paymentStatus === 'completed') {
    return (
      <div className="inline-flex flex-col items-start px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-100">
        <span className="text-xs font-semibold leading-tight">{formatCurrency(0)}</span>
        <span className="text-[10px] font-medium leading-tight">Paid</span>
      </div>
    );
  }

  if (student.paymentStatus === 'pending') {
    return (
      <div className="inline-flex flex-col items-start px-2.5 py-1.5 bg-amber-50 text-amber-900 rounded-lg border border-amber-100">
        <span className="text-xs font-semibold leading-tight">
          {formatCurrency(student.pendingAmount || 0)}
        </span>
        <span className="text-[10px] font-medium leading-tight text-amber-700">Pending</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 text-xs text-gray-500">
      <FiAlertCircle size={12} />
      Unknown
    </div>
  );
}

function getStatusDisplay(student: FeeStudentRow) {
  if (student.paymentStatus === 'not_assigned') {
    return { label: 'Unassigned', className: 'bg-orange-100 text-orange-700' };
  }
  if (student.paymentStatus === 'completed') {
    return { label: 'Paid', className: 'bg-green-100 text-green-700' };
  }
  if (student.paymentStatus === 'pending') {
    const amount = student.pendingAmount || 0;
    if (amount > 0) {
      return { label: 'Overdue', className: 'bg-red-100 text-red-700' };
    }
    return { label: 'Due Soon', className: 'bg-orange-100 text-orange-700' };
  }
  return { label: 'Unknown', className: 'bg-gray-100 text-gray-600' };
}
