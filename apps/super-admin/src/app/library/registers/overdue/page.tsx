'use client';

import LibraryCirculationReport from '@/features/library/components/LibraryCirculationReport';

export default function OverdueRegisterPage() {
  return (
    <LibraryCirculationReport
      title="Overdue Books"
      description="Issued copies that are past their due date."
      type="overdue"
      emptyText="No overdue books"
    />
  );
}
