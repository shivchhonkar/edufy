'use client';

import InventoryDocumentPage from '@/features/inventory/components/InventoryDocumentPage';

export default function GrnPage() {
  return (
    <InventoryDocumentPage
      kind="grn"
      title="GRN / Goods Receipt"
      description="Receive goods against a purchase and add them to store stock."
      showVendor
      showPrice
    />
  );
}
