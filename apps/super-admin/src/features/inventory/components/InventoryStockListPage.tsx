'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import InventoryModuleLinks from '@/features/inventory/components/InventoryModuleLinks';
import { inventoryItemLabel } from '@/features/inventory/item-label';

type Row = Record<string, unknown>;

export default function InventoryStockListPage({
  title,
  description,
  type,
}: {
  title: string;
  description: string;
  type: 'current' | 'ledger' | 'low';
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/stock?type=${type}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <InventoryModuleLinks />
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                {type === 'ledger' ? (
                  <>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">From / to</th>
                    <th className="px-3 py-2">Balance</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Min</th>
                    <th className="px-3 py-2">Value</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-400">Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">No records</td>
                </tr>
              ) : type === 'ledger' ? (
                rows.map((row) => (
                  <tr key={String(row.id)} className="border-t">
                    <td className="px-3 py-2">{String(row.transaction_date || row.created_at).slice(0, 10)}</td>
                    <td className="px-3 py-2 font-medium">
                      {inventoryItemLabel({ item_name: String(row.item_name), size: row.size ? String(row.size) : null })}
                    </td>
                    <td className="px-3 py-2 capitalize">{String(row.transaction_type)}</td>
                    <td className="px-3 py-2">{String(row.quantity)}</td>
                    <td className="px-3 py-2">{String(row.issued_to_name || row.location_name || '—')}</td>
                    <td className="px-3 py-2">{row.qty_after != null ? String(row.qty_after) : '—'}</td>
                  </tr>
                ))
              ) : (
                rows.map((row) => (
                  <tr key={String(row.id)} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {inventoryItemLabel({ item_name: String(row.item_name), size: row.size ? String(row.size) : null })}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{String(row.item_code || '—')}</td>
                    <td className="px-3 py-2">{String(row.category_name || '—')}</td>
                    <td className={`px-3 py-2 ${Number(row.quantity) <= Number(row.min_stock_level || 0) ? 'font-medium text-red-600' : ''}`}>
                      {String(row.quantity)} {String(row.unit || '')}
                    </td>
                    <td className="px-3 py-2">{String(row.min_stock_level || 0)}</td>
                    <td className="px-3 py-2">₹ {(Number(row.quantity || 0) * Number(row.unit_price || 0)).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
