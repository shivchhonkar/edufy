'use client';

import { useEffect, useRef, useState } from 'react';
import { FiSearch, FiUser } from 'react-icons/fi';

export interface StaffSearchOption {
  id: number;
  name: string;
  phone: string;
  employee_id: string;
  department_name?: string | null;
  designation_name?: string | null;
}

interface StaffSearchFieldProps {
  value: string;
  onChange: (name: string) => void;
  onSelect: (staff: StaffSearchOption) => void;
  required?: boolean;
  placeholder?: string;
}

export default function StaffSearchField({
  value,
  onChange,
  onSelect,
  required,
  placeholder = 'Search staff by name, ID, or phone...',
}: StaffSearchFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StaffSearchOption[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/visitors/staff-search?q=${encodeURIComponent(query)}&limit=10`,
        );
        const result = await response.json();
        if (response.ok && result.success) {
          setResults(result.data || []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  const handleSelect = (staff: StaffSearchOption) => {
    onSelect(staff);
    setOpen(false);
  };

  const showDropdown = open && value.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={value}
          required={required}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          autoComplete="off"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching staff...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No staff found. You can still enter a name manually.
            </div>
          ) : (
            results.map((staff) => (
              <button
                key={staff.id}
                type="button"
                onClick={() => handleSelect(staff)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-b-0"
              >
                <div className="w-8 h-8 shrink-0 bg-primary-50 rounded-full flex items-center justify-center">
                  <FiUser className="w-4 h-4 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-gray-900 truncate">{staff.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {[staff.designation_name, staff.department_name, staff.employee_id]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {staff.phone && (
                    <div className="text-xs text-gray-400 mt-0.5">{staff.phone}</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
