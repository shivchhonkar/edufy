'use client';

import LibraryCirculationReport from '@/features/library/components/LibraryCirculationReport';

export default function LostDamagedRegisterPage() {
  return (
    <LibraryCirculationReport
      title="Lost / Damaged Books"
      description="Copies recorded as lost or damaged."
      type="lost"
      emptyText="No lost or damaged books"
    />
  );
}
