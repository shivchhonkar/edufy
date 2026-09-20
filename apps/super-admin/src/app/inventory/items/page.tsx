'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import InventoryModuleLinks from '@/features/inventory/components/InventoryModuleLinks';
import InventoryItemFormModal from '@/features/inventory/components/InventoryItemFormModal';
import { inventoryItemLabel } from '@/features/inventory/item-label';

type Item = {
  id: number;
  item_name: string;
  item_code?: string;
  category_id?: number;
  category_name?: string;
  unit?: string;
  quantity: number;
  min_stock_level?: number;
  unit_price?: number;
  barcode?: string;
  is_asset?: boolean;
  size?: string | null;
  description?: string | null;
};
type Option = { id: number; name: string };

export default function InventoryItemsPage() {
  const { alert, confirm } = useDialog();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [units, setUnits] = useState<Option[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const [iRes, cRes, uRes] = await Promise.all([
      fetch(`/api/inventory/items?${params}`, { cache: 'no-store' }),
      fetch('/api/inventory/masters/categories'),
      fetch('/api/inventory/masters/units'),
    ]);
    const [iData, cData, uData] = await Promise.all([iRes.json(), cRes.json(), uRes.json()]);
    if (iData.success) setItems(iData.data || []);
    if (cData.success) setCategories(cData.data || []);
    if (uData.success) setUnits(uData.data || []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 150);
    return () => clearTimeout(timer);
  }, [load]);

  const openAdd = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingItem(null);
  };

  const remove = async (item: Item) => {
    const ok = await confirm(`Delete "${inventoryItemLabel(item)}"?`, { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    const res = await fetch(`/api/inventory/items/${item.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Cannot delete this item', { title: 'Error', type: 'error' });
      return;
    }
    load();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Item Master</h1>
            <p className="mt-1 text-sm text-gray-500">Catalog of consumables and assets with reorder levels.</p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
          >
            <FiPlus size={14} /> Add item
          </button>
        </div>
        <InventoryModuleLinks />
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code or barcode..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">S.N.</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Min</th>
                <th className="px-3 py-2">Rate</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td colSpan={9} className="px-3 py-3"><div className="h-3 w-40 animate-pulse rounded bg-gray-200" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    No items yet. Click Add item to create one.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2 font-medium">
                      {inventoryItemLabel(item)}
                      {item.is_asset ? <span className="ml-2 text-[10px] uppercase text-indigo-600">Asset</span> : null}
                    </td>
                    <td className="px-3 py-2">{item.size || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{item.item_code || item.barcode || '—'}</td>
                    <td className="px-3 py-2">{item.category_name || '—'}</td>
                    <td className={`px-3 py-2 ${item.quantity <= (item.min_stock_level || 0) ? 'font-medium text-red-600' : ''}`}>
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-3 py-2">{item.min_stock_level || 0}</td>
                    <td className="px-3 py-2">₹ {Number(item.unit_price || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="mr-3 text-sm text-primary-700" onClick={() => openEdit(item)}>
                        Modify
                      </button>
                      <button type="button" onClick={() => remove(item)} className="text-red-600">
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <InventoryItemFormModal
        open={formOpen}
        onClose={closeForm}
        onSaved={load}
        categories={categories}
        units={units}
        item={editingItem}
      />
    </DashboardLayout>
  );
}
