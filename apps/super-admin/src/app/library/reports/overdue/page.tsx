'use client';

import LibraryCirculationReport from '@/features/library/components/LibraryCirculationReport';

export default function OverdueReportPage() {
  return (
    <LibraryCirculationReport
      title="Overdue Report"
      description="Issued copies that are past their due date."
      type="overdue"
      emptyText="No overdue books"
    />
  );
}
