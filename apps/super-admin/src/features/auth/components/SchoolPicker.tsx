'use client';

import { useMemo, useState } from 'react';
import { FiMapPin, FiSearch } from 'react-icons/fi';
import type { PublicSchoolOption } from '@/lib/selected-school';

interface SchoolPickerProps {
  schools: PublicSchoolOption[];
  selectedSchoolId?: number | null;
  onSelect: (school: PublicSchoolOption) => void;
}

export default function SchoolPicker({ schools, selectedSchoolId, onSelect }: SchoolPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((school) => {
      const haystack = [school.name, school.slug, school.city ?? ''].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [query, schools]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search schools…"
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          aria-label="Search schools"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          No schools match your search.
        </p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {filtered.map((school) => {
            const isSelected = selectedSchoolId === school.id;
            return (
              <li key={school.id}>
                <button
                  type="button"
                  onClick={() => onSelect(school)}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>
                    <span className="block font-medium">{school.name}</span>
                    {school.city && (
                      <span
                        className={`mt-0.5 inline-flex items-center gap-1 text-xs ${
                          isSelected ? 'text-gray-200' : 'text-gray-500'
                        }`}
                      >
                        <FiMapPin size={12} />
                        {school.city}
                      </span>
                    )}
                  </span>
                  {school.is_primary && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isSelected ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Primary
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
