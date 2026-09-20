'use client';

import { useEffect, useRef, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { studentFullName } from '@/features/students/utils/student-profile';
import type { Student } from '@/shared/types';

const INPUT =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none';

interface StudentPickSelectProps {
  value: string;
  onChange: (studentId: string) => void;
  onQueryChange?: (query: string) => void;
  classId?: string;
  disabled?: boolean;
  placeholder?: string;
}

function studentLabel(student: Student): string {
  const classPart = student.class_name
    ? ` (${[student.class_name, student.section_name].filter(Boolean).join('-')})`
    : '';
  return `${student.admission_number} — ${studentFullName(student)}${classPart}`;
}

export default function StudentPickSelect({
  value,
  onChange,
  onQueryChange,
  classId,
  disabled,
  placeholder = 'Search student name or admission no.',
}: StudentPickSelectProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selected, setSelected] = useState<Student | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      setQuery('');
    }
  }, [value]);

  useEffect(() => {
    if (!open || disabled) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '20', status: 'active' });
        if (classId) params.set('class_id', classId);
        if (query.trim()) params.set('search', query.trim());
        const res = await fetch(`/api/students?${params}`);
        const data = await res.json();
        if (data.success) {
          setSuggestions(data.data || []);
          setHighlight(0);
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, classId, open, disabled]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (student: Student) => {
    setSelected(student);
    setQuery(studentLabel(student));
    onChange(String(student.id));
    onQueryChange?.(studentFullName(student));
    setOpen(false);
  };

  const clear = () => {
    setSelected(null);
    setQuery('');
    onChange('');
    onQueryChange?.('');
    setSuggestions([]);
    setOpen(true);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => Math.min(index + 1, Math.max(suggestions.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const student = suggestions[highlight];
      if (student) pick(student);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400" size={16} />
      <input
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          onQueryChange?.(next);
          if (selected) {
            setSelected(null);
            onChange('');
          }
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`${INPUT} pl-9 pr-9`}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Clear selected student"
        >
          <FiX size={16} />
        </button>
      )}

      {open && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {loading && (
            <li className="px-3 py-2 text-sm text-gray-400">Searching...</li>
          )}
          {!loading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">
              {query.trim() ? 'No students found' : 'Type a name or admission number'}
            </li>
          )}
          {!loading &&
            suggestions.map((student, index) => (
              <li key={student.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(student)}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${
                    String(student.id) === value || index === highlight
                      ? 'bg-primary-50 text-primary-800'
                      : 'text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{studentFullName(student)}</span>
                  <span className="text-xs text-gray-500">
                    {student.admission_number}
                    {student.class_name
                      ? ` · ${[student.class_name, student.section_name].filter(Boolean).join('-')}`
                      : ''}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export { INPUT as STUDENT_OPS_INPUT };
