'use client';

import LibraryCirculationReport from '@/features/library/components/LibraryCirculationReport';

export default function IssueReportPage() {
  return (
    <LibraryCirculationReport
      title="Issue Report"
      description="Books issued to students and staff."
      type="issue-return"
      showDateFilters
      emptyText="No issues in this period"
    />
  );
}
