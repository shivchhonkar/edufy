'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiEye,
  FiUserCheck,
} from 'react-icons/fi';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';

const ROW_HEIGHT = 72;
const OVERSCAN = 12;

const GRID_COLUMNS =
  'minmax(10rem,1.5fr) minmax(8rem,1fr) minmax(7rem,0.9fr) minmax(7rem,0.9fr) minmax(10rem,1.1fr) minmax(15rem,1.6fr)';

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
      <div className="px-4 py-8 text-center text-gray-500">
        <p className="text-lg font-medium">No students found</p>
        <p className="text-sm mt-1">
          {hasActiveFilters
            ? 'Try adjusting your search filters'
            : 'No students are currently enrolled'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="grid items-center bg-gray-50 border-b"
        style={{ gridTemplateColumns: GRID_COLUMNS }}
      >
        <HeaderCell>Student</HeaderCell>
        <HeaderCell>Parent</HeaderCell>
        <HeaderCell>Class</HeaderCell>
        <HeaderCell>Contact</HeaderCell>
        <HeaderCell>Status</HeaderCell>
        <HeaderCell className="text-right">Actions</HeaderCell>
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
      className={`px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
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
  return (
    <div
      className="grid items-center border-b border-gray-200 hover:bg-gray-50 bg-white"
      style={{ gridTemplateColumns: GRID_COLUMNS, ...style }}
    >
      <div className="px-4 py-2 overflow-hidden">
        <p className="text-sm text-gray-900 truncate">
          {student.first_name} {student.last_name}
        </p>
        <p className="text-sm text-gray-600 truncate">{student.admission_number}</p>
      </div>

      <div className="px-4 py-2 overflow-hidden">
        <p className="text-sm text-gray-900 truncate">{student.parent_name || 'N/A'}</p>
      </div>

      <div className="px-4 py-2 overflow-hidden">
        <p className="text-xs text-gray-900 truncate">{student.class_name || 'N/A'}</p>
        {student.section_name && (
          <p className="text-xs text-gray-600 truncate">Section: {student.section_name}</p>
        )}
      </div>

      <div className="px-4 py-2 overflow-hidden">
        <p className="text-sm text-gray-600 truncate">{student.parent_phone || 'N/A'}</p>
      </div>

      <div className="px-4 py-2">
        <PaymentStatusBadge student={student} formatCurrency={formatCurrency} />
      </div>

      <div className="px-4 py-2">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onViewFees(student)}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1 transition-colors text-[10px] font-medium whitespace-nowrap"
          >
            <FiEye size={14} />
            View Fees
          </button>
          <button
            onClick={() => onRecordPayment(student)}
            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1 transition-colors text-[10px] font-medium whitespace-nowrap"
          >
            <RupeeIcon size={14} />
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentStatusBadge({
  student,
  formatCurrency,
}: {
  student: FeeStudentRow;
  formatCurrency: (amount: number | string | null | undefined) => string;
}) {
  if (student.paymentStatus === 'completed') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full">
        {/* <FiUserCheck size={14} /> */}
        <span className="text-[10px] font-medium">Completed</span>
      </div>
    );
  }

  if (student.paymentStatus === 'pending') {
    return (
      <div className="inline-flex flex-col items-start gap-0.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg">
        <span className="text-xs font-semibold leading-tight">
          {formatCurrency(student.pendingAmount || 0)}
        </span>
        <span className="text-[10px] font-medium leading-tight">Pending</span>
      </div>
    );
  }

  if (student.paymentStatus === 'not_assigned') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full">
        <FiAlertCircle size={14} />
        <span className="text-[10px] font-medium">No Fees Assigned</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full">
      <FiAlertCircle size={14} />
      <span className="text-[10px] font-medium">Unknown</span>
    </div>
  );
}
