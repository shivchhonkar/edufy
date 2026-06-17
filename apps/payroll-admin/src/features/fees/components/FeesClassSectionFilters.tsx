'use client';

import type { ClassOption, SectionOption } from '@/features/fees/hooks/useClassSectionOptions';

interface FeesClassSectionFiltersProps {
  classes: ClassOption[];
  sections: SectionOption[];
  classId: string;
  sectionId: string;
  onClassChange: (classId: string) => void;
  onSectionChange: (sectionId: string) => void;
  loadingSections?: boolean;
  className?: string;
  selectClassName?: string;
}

export default function FeesClassSectionFilters({
  classes,
  sections,
  classId,
  sectionId,
  onClassChange,
  onSectionChange,
  loadingSections,
  className = '',
  selectClassName = 'px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[140px]',
}: FeesClassSectionFiltersProps) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <select
        value={classId}
        onChange={(e) => onClassChange(e.target.value)}
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
        onChange={(e) => onSectionChange(e.target.value)}
        disabled={!classId || loadingSections}
        className={`${selectClassName} disabled:bg-gray-100 disabled:cursor-not-allowed`}
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
  );
}
