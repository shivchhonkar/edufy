'use client';

import InventoryDocumentPage from '@/features/inventory/components/InventoryDocumentPage';

export default function PhysicalVerificationPage() {
  return (
    <InventoryDocumentPage
      kind="count"
      title="Physical Stock Verification"
      description="Enter counted quantity against system stock. Posting writes the difference as an adjustment."
      showCounted
    />
  );
}
