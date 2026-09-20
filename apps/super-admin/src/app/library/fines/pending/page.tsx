'use client';

import LibraryCirculationReport from '@/features/library/components/LibraryCirculationReport';

export default function PendingFinesPage() {
  return (
    <LibraryCirculationReport
      title="Pending Fines"
      description="Overdue issued copies that may attract a fine on return."
      type="overdue"
      emptyText="No pending fines"
    />
  );
}
