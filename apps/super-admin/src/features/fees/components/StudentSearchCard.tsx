'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FiSearch, FiUser } from 'react-icons/fi';
import { useClassSectionOptions } from '@/features/fees/hooks/useClassSectionOptions';
import { filterFeeStudents } from '@/features/fees/utils/student-filters';
import type { FeeStudentRow } from '@/features/fees/components/VirtualizedFeesStudentsTable';

interface StudentSearchCardProps {
  students: FeeStudentRow[];
  loading?: boolean;
  selectedStudent: FeeStudentRow | null;
  onSelect: (student: FeeStudentRow | null) => void;
  autoFocus?: boolean;
}

const selectClassName =
  'flex-1 min-w-[7.5rem] px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed';

export default function StudentSearchCard({
  students,
  loading,
  selectedStudent,
  onSelect,
  autoFocus = true,
}: StudentSearchCardProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    classes,
    sections,
    classId,
    sectionId,
    setClassId,
    setSectionId,
    loadingSections,
    hasActiveFilters,
  } = useClassSectionOptions();

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      setQuery(
        `${selectedStudent.admission_number} — ${selectedStudent.first_name} ${selectedStudent.last_name}`,
      );
    }
  }, [selectedStudent]);

  const pool = useMemo(
    () => filterFeeStudents(students, { search: query, classId, sectionId }),
    [students, query, classId, sectionId],
  );

  const results = useMemo(() => {
    if (selectedStudent && query.includes('—')) return [];
    const hasQuery = query.trim().length > 0;
    if (!hasQuery && !hasActiveFilters) return [];
    return pool.slice(0, 12);
  }, [pool, query, selectedStudent, hasActiveFilters]);

  const showDropdown = open && !selectedStudent && results.length > 0;
  const showEmptyDropdown =
    open && !selectedStudent && (query.trim() || hasActiveFilters) && !loading && results.length === 0;

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
    >
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Search Student</h2>
      <p className="text-xs text-gray-500 mb-3">
        Search, or narrow by class and section
      </p>

      <div className="relative">
        <div className="flex flex-wrap gap-2 items-stretch">
          <div className="relative flex-[2] min-w-[12rem]">
            <FiSearch className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={18} />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                if (selectedStudent) onSelect(null);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
                if (e.key === 'Enter' && results[0]) {
                  onSelect(results[0]);
                  setOpen(false);
                }
              }}
              placeholder="Admission no., name, mobile..."
              className="w-full h-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Search student"
              autoComplete="off"
            />
          </div>
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setOpen(true);
              if (selectedStudent) onSelect(null);
            }}
            className={selectClassName}
            aria-label="Filter by class"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={sectionId}
            onChange={(e) => {
              setSectionId(e.target.value);
              setOpen(true);
              if (selectedStudent) onSelect(null);
            }}
            disabled={!classId || loadingSections}
            className={selectClassName}
            aria-label="Filter by section"
          >
            <option value="">All Sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {(showDropdown || showEmptyDropdown) && (
          <div
            className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-auto"
            role="listbox"
          >
            {loading ? (
              <p className="px-4 py-3 text-sm text-gray-500">Loading students...</p>
            ) : showEmptyDropdown ? (
              <p className="px-4 py-3 text-sm text-gray-500">No students found</p>
            ) : (
              results.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  role="option"
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  onClick={() => {
                    onSelect(student);
                    setOpen(false);
                  }}
                >
                  <p className="font-medium text-gray-900 text-sm">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {student.admission_number}
                    {student.class_name ? ` · ${student.class_name}` : ''}
                    {student.section_name ? ` · ${student.section_name}` : ''}
                    {student.parent_phone ? ` · ${student.parent_phone}` : ''}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="mt-4 flex items-start gap-3 p-3 bg-primary-50 rounded-lg border border-primary-100">
          <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0">
            <FiUser size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">
              {selectedStudent.first_name} {selectedStudent.last_name}
            </p>
            <p className="text-sm text-gray-600">
              {selectedStudent.admission_number}
              {selectedStudent.class_name ? ` · ${selectedStudent.class_name}` : ''}
              {selectedStudent.section_name ? ` · ${selectedStudent.section_name}` : ''}
            </p>
            {selectedStudent.parent_phone && (
              <p className="text-xs text-gray-500 mt-0.5">Parent: {selectedStudent.parent_phone}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery('');
              inputRef.current?.focus();
            }}
            className="ml-auto text-xs text-primary-700 hover:underline shrink-0"
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
}
