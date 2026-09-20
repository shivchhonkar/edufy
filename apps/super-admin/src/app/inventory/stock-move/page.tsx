'use client';

import InventoryDocumentPage from '@/features/inventory/components/InventoryDocumentPage';

export default function StockMovePage() {
  return (
    <InventoryDocumentPage
      kind="in"
      title="Stock In / Out"
      description="Add stock to a store or remove it for consumption, damage or write-off."
      allowInOutToggle
    />
  );
}
