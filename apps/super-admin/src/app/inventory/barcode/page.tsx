'use client';

import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import InventoryModuleLinks from '@/features/inventory/components/InventoryModuleLinks';
import { inventoryItemLabel } from '@/features/inventory/item-label';

type Item = { id: number; item_name: string; item_code?: string; barcode?: string; size?: string | null };

function ItemBarcode({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, { format: 'CODE128', height: 48, displayValue: true, fontSize: 12, margin: 4 });
    } catch {
      /* ignore invalid barcode payload */
    }
  }, [value]);
  return <svg ref={svgRef} className="max-w-full" />;
}

export default function InventoryBarcodePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/inventory/items', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setItems(data.data || []);
      });
  }, []);

  const rows = items.filter((item) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [item.item_name, item.item_code, item.barcode, item.size].some((v) => String(v || '').toLowerCase().includes(q));
  });

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Barcode / QR</h1>
          <p className="mt-1 text-sm text-gray-500">Printable Code128 barcodes from item code. Use the code on GRN, issue and stock count.</p>
        </div>
        <InventoryModuleLinks />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="w-full rounded-lg border px-3 py-2 text-sm" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
          {rows.map((item) => {
            const code = item.barcode || item.item_code || String(item.id);
            return (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="truncate text-sm font-medium">{inventoryItemLabel(item)}</p>
                <ItemBarcode value={code} />
                <img
                  alt=""
                  className="mx-auto mt-2 h-20 w-20"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(code)}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
