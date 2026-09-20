'use client';

import InventoryDocumentPage from '@/features/inventory/components/InventoryDocumentPage';

export default function PurchaseOrdersPage() {
  return (
    <InventoryDocumentPage
      kind="po"
      title="Purchase Order"
      description="Place an order with a vendor after a request is approved."
      showVendor
      showPrice
      postRequiresApprove
    />
  );
}
