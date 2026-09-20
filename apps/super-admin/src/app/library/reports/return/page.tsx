'use client';

import LibraryCirculationReport from '@/features/library/components/LibraryCirculationReport';

export default function ReturnReportPage() {
  return (
    <LibraryCirculationReport
      title="Return Report"
      description="Books returned by students and staff."
      type="returned"
      showDateFilters
      emptyText="No returns in this period"
    />
  );
}
