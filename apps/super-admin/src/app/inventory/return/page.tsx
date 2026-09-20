'use client';

import InventoryDocumentPage from '@/features/inventory/components/InventoryDocumentPage';

export default function InventoryReturnPage() {
  return (
    <InventoryDocumentPage
      kind="return"
      title="Return"
      description="Take items back from a department, staff member or student into store stock."
      showParty
      partyTypes={['student', 'staff', 'department']}
    />
  );
}
