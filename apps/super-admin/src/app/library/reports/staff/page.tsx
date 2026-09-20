'use client';

import LibraryCirculationReport from '@/features/library/components/LibraryCirculationReport';

export default function StaffReportPage() {
  return (
    <LibraryCirculationReport
      title="Staff Report"
      description="Circulation history for staff."
      type="issue-return"
      lockedBorrowerType="staff"
      showDateFilters
      emptyText="No staff circulation records"
    />
  );
}
