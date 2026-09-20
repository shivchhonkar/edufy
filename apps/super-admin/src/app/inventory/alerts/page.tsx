'use client';

import InventoryStockListPage from '@/features/inventory/components/InventoryStockListPage';

export default function LowStockPage() {
  return (
    <InventoryStockListPage
      title="Low Stock Alerts"
      description="Items at or below the minimum stock level."
      type="low"
    />
  );
}
