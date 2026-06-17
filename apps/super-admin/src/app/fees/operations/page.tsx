'use client';

import FeesOperationsPanel from '@/features/fees/components/FeesOperationsPanel';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';

export default function FeesOperationsPage() {
  return (
    <div className="space-y-4">
      <FeesPageHeader
        title="Fee Operations"
        description="Administrative tools for fee generation, assignment, and reconciliation."
      />
      <FeesOperationsPanel />
    </div>
  );
}
