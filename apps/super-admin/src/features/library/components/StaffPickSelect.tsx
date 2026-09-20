'use client';

import { useEffect, useRef, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

const INPUT =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none';

interface StaffRow {
  id: number;
  first_name: string;
  last_name?: string | null;
  employee_id?: string | null;
  department_name?: string | null;
}

function staffLabel(staff: StaffRow) {
  const name = [staff.first_name, staff.last_name].filter(Boolean).join(' ');
  return staff.employee_id ? `${staff.employee_id} — ${name}` : name;
}

interface StaffPickSelectProps {
  value: string;
  onChange: (staffId: string) => void;
  disabled?: boolean;
}

export default function StaffPickSelect({ value, onChange, disabled }: StaffPickSelectProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StaffRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StaffRow | null>(null);
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
        const params = new URLSearchParams();
        if (query.trim()) params.set('search', query.trim());
        const res = await fetch(`/api/library/staff?${params}`);
        const data = await res.json();
        if (data.success) setSuggestions(data.data || []);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open, disabled]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (staff: StaffRow) => {
    setSelected(staff);
    setQuery(staffLabel(staff));
    onChange(String(staff.id));
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400" size={16} />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (selected) {
            setSelected(null);
            onChange('');
          }
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search staff name or employee ID"
        className={`${INPUT} pl-9 pr-9`}
        disabled={disabled}
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setQuery('');
            onChange('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100"
          aria-label="Clear selected staff"
        >
          <FiX size={16} />
        </button>
      )}
      {open && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {loading && <li className="px-3 py-2 text-sm text-gray-400">Searching...</li>}
          {!loading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">
              {query.trim() ? 'No staff found' : 'Type a name or employee ID'}
            </li>
          )}
          {!loading &&
            suggestions.map((staff) => (
              <li key={staff.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(staff)}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${
                    String(staff.id) === value ? 'bg-primary-50 text-primary-800' : 'text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{[staff.first_name, staff.last_name].filter(Boolean).join(' ')}</span>
                  <span className="text-xs text-gray-500">
                    {[staff.employee_id, staff.department_name].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
