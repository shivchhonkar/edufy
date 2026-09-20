'use client';

import InventoryDocumentPage from '@/features/inventory/components/InventoryDocumentPage';

export default function InventoryIssuePage() {
  return (
    <InventoryDocumentPage
      kind="sale"
      title="Issue / Sell"
      description="Issue or sell items to a department, staff member or student. Posting reduces stock."
      showParty
      partyTypes={['student', 'staff', 'department']}
      showPrice
      useModalForm
    />
  );
}
