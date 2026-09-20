'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import InventoryModuleLinks from '@/features/inventory/components/InventoryModuleLinks';
import { printHtmlDocument } from '@/features/students/utils/print-html';
import { inventoryItemLabel } from '@/features/inventory/item-label';

export default function InventoryReportsPage() {
  const [summary, setSummary] = useState({ totalItems: 0, lowStock: 0, stockValue: 0 });
  const [movement, setMovement] = useState<{ transaction_type: string; entries: number; quantity: number }[]>([]);
  const [issues, setIssues] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/reports?type=summary').then((r) => r.json()),
      fetch('/api/inventory/reports?type=movement').then((r) => r.json()),
      fetch('/api/inventory/reports?type=issue').then((r) => r.json()),
    ]).then(([s, m, i]) => {
      if (s.success) setSummary(s.data);
      if (m.success) setMovement(m.data || []);
      if (i.success) setIssues(i.data || []);
    });
  }, []);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Inventory Reports</h1>
            <p className="mt-1 text-sm text-gray-500">Stock value, movements and issued / sold items.</p>
          </div>
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm"
            onClick={() =>
              printHtmlDocument(
                'Inventory Reports',
                `<h1>Inventory Reports</h1>
                 <p>Items ${summary.totalItems} | Low stock ${summary.lowStock} | Value ₹ ${summary.stockValue.toFixed(2)}</p>`
              )
            }
          >
            Print
          </button>
        </div>
        <InventoryModuleLinks />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-blue-700">
            <p className="text-[11px]">Items</p>
            <p className="text-lg font-semibold">{summary.totalItems}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-red-700">
            <p className="text-[11px]">Low stock</p>
            <p className="text-lg font-semibold">{summary.lowStock}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-700">
            <p className="text-[11px]">Stock value</p>
            <p className="text-lg font-semibold">₹ {Number(summary.stockValue || 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Movement</th>
                <th className="px-3 py-2">Entries</th>
                <th className="px-3 py-2">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {movement.map((row) => (
                <tr key={row.transaction_type} className="border-t">
                  <td className="px-3 py-2 capitalize">{row.transaction_type}</td>
                  <td className="px-3 py-2">{row.entries}</td>
                  <td className="px-3 py-2">{row.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Doc</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Party</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Qty</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((row, index) => (
                <tr key={index} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{String(row.doc_no)}</td>
                  <td className="px-3 py-2">{String(row.doc_date).slice(0, 10)}</td>
                  <td className="px-3 py-2">{String(row.party_name || row.party_type || '—')}</td>
                  <td className="px-3 py-2">
                    {inventoryItemLabel({
                      item_name: String(row.item_name),
                      size: row.size ? String(row.size) : null,
                    })}
                  </td>
                  <td className="px-3 py-2">{String(row.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
