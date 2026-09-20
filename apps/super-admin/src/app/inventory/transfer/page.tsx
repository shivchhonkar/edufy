'use client';

import InventoryDocumentPage from '@/features/inventory/components/InventoryDocumentPage';

export default function InventoryTransferPage() {
  return (
    <InventoryDocumentPage
      kind="transfer"
      title="Stock Transfer"
      description="Move stock from one store location to another."
      showToLocation
    />
  );
}
