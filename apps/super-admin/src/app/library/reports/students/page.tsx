'use client';

import LibraryCirculationReport from '@/features/library/components/LibraryCirculationReport';

export default function StudentReportPage() {
  return (
    <LibraryCirculationReport
      title="Student Report"
      description="Circulation history for students."
      type="issue-return"
      lockedBorrowerType="student"
      showDateFilters
      emptyText="No student circulation records"
    />
  );
}
