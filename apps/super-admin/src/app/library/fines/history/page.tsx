'use client';

import LibraryCirculationReport from '@/features/library/components/LibraryCirculationReport';

export default function FineHistoryPage() {
  return (
    <LibraryCirculationReport
      title="Fine History"
      description="Circulation records that have a fine amount."
      type="fines"
      showDateFilters
      emptyText="No fine history"
    />
  );
}
