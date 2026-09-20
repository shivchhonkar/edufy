'use client';

import InventoryStockListPage from '@/features/inventory/components/InventoryStockListPage';

export default function CurrentStockPage() {
  return (
    <InventoryStockListPage
      title="Current Stock"
      description="On-hand quantity and value by item."
      type="current"
    />
  );
}
