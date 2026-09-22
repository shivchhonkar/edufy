'use client';

import InventoryDocumentPage from '@/features/inventory/components/InventoryDocumentPage';

export default function PurchaseRequestsPage() {
  return (
    <InventoryDocumentPage
      kind="pr"
      title="Purchase Request"
      description="Raise a request for items that need to be purchased."
      showVendor
      postRequiresApprove
      useModalForm
    />
  );
}
