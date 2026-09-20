'use client';

import InventoryDocumentPage from '@/features/inventory/components/InventoryDocumentPage';

export default function InventoryAdjustmentPage() {
  return (
    <InventoryDocumentPage
      kind="adjustment"
      title="Stock Adjustment"
      description="Increase or decrease stock with a signed quantity (use negative qty to reduce)."
    />
  );
}
