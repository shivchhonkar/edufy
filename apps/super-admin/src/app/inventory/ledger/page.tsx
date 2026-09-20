'use client';

import InventoryStockListPage from '@/features/inventory/components/InventoryStockListPage';

export default function StockLedgerPage() {
  return (
    <InventoryStockListPage
      title="Stock Ledger"
      description="Every stock movement with running balance."
      type="ledger"
    />
  );
}
