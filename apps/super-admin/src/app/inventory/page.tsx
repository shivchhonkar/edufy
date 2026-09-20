'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { FiAlertCircle, FiPackage, FiSearch, FiShoppingCart, FiX } from 'react-icons/fi';
import InventoryModuleLinks from '@/features/inventory/components/InventoryModuleLinks';
import { inventoryItemLabel } from '@/features/inventory/item-label';
import { useDialog } from '@/shared/context/DialogContext';

type LocationQty = { location_id: number; location: string; quantity: number };
type StockRow = {
  id: number;
  item_name: string;
  item_code?: string;
  size?: string | null;
  unit?: string;
  quantity: number;
  min_stock_level?: number;
  unit_price?: number;
  barcode?: string;
  category_name?: string;
  locations?: LocationQty[] | null;
};
type Location = { id: number; name: string };
type PartyHit = { id: number; name: string; code?: string };

const PARTY_TYPES = ['student', 'staff', 'department'];

const QUICK = [
  { href: '/inventory/items', label: 'Items' },
  { href: '/inventory/issue', label: 'Issue / Sell' },
  { href: '/inventory/grn', label: 'GRN' },
  { href: '/inventory/stock', label: 'Current Stock' },
  { href: '/inventory/alerts', label: 'Low Stock' },
  { href: '/inventory/assets', label: 'Assets' },
];

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/90 ${className}`} />;
}

function SummaryCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <Pulse className="h-3 w-16" />
      <Pulse className="mt-3 h-7 w-24" />
    </div>
  );
}

function StockTableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <tr key={index} className="border-t">
          <td className="px-3 py-3"><Pulse className="h-3.5 w-6" /></td>
          <td className="px-3 py-3">
            <Pulse className="h-3.5 w-40 max-w-full" />
            <Pulse className="mt-1.5 h-3 w-16" />
          </td>
          <td className="px-3 py-3"><Pulse className="h-3.5 w-14" /></td>
          <td className="px-3 py-3"><Pulse className="h-3.5 w-20" /></td>
          <td className="px-3 py-3"><Pulse className="h-3.5 w-24" /></td>
          <td className="px-3 py-3"><Pulse className="h-3.5 w-16" /></td>
          <td className="px-3 py-3"><Pulse className="h-3.5 w-10" /></td>
          <td className="px-3 py-3"><Pulse className="h-3.5 w-16" /></td>
          <td className="px-3 py-3"><Pulse className="h-3.5 w-20" /></td>
          <td className="px-3 py-3"><Pulse className="ml-auto h-8 w-14" /></td>
        </tr>
      ))}
    </>
  );
}

function locationLabel(row: StockRow) {
  const locations = (row.locations || []).filter((loc) => loc && loc.location);
  if (!locations.length) return '—';
  return locations.map((loc) => `${loc.location} (${loc.quantity})`).join(', ');
}

export default function InventoryDashboardPage() {
  const { alert } = useDialog();
  const [summary, setSummary] = useState({ totalItems: 0, lowStock: 0, stockValue: 0 });
  const [stock, setStock] = useState<StockRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sellOpen, setSellOpen] = useState(false);
  const [selling, setSelling] = useState(false);
  const [sell, setSell] = useState({
    item_id: '',
    quantity: '1',
    unit_price: '0',
    location_id: '',
    party_type: 'student',
    party_id: '',
    party_name: '',
    doc_date: new Date().toISOString().slice(0, 10),
  });
  const [partyQuery, setPartyQuery] = useState('');
  const [partyHits, setPartyHits] = useState<PartyHit[]>([]);

  const load = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const [sRes, listRes, locRes] = await Promise.all([
        fetch('/api/inventory/reports?type=summary', { cache: 'no-store' }),
        fetch('/api/inventory/stock?type=current', { cache: 'no-store' }),
        fetch('/api/inventory/masters/locations', { cache: 'no-store' }),
      ]);
      const [s, list, loc] = await Promise.all([sRes.json(), listRes.json(), locRes.json()]);
      if (s.success) setSummary(s.data);
      if (list.success) setStock(list.data || []);
      if (loc.success) {
        const next = loc.data || [];
        setLocations(next);
        setSell((prev) => ({ ...prev, location_id: prev.location_id || String(next[0]?.id || '') }));
      }
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!sellOpen || partyQuery.trim().length < 1) {
      setPartyHits([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/inventory/parties?type=${sell.party_type}&q=${encodeURIComponent(partyQuery)}`);
      const data = await res.json();
      if (data.success) setPartyHits(data.data || []);
    }, 200);
    return () => clearTimeout(timer);
  }, [partyQuery, sell.party_type, sellOpen]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stock;
    return stock.filter((item) =>
      [item.item_name, item.item_code, item.barcode, item.size, item.category_name]
        .some((value) => String(value || '').toLowerCase().includes(q))
    );
  }, [stock, search]);

  const openSell = (item?: StockRow) => {
    const firstLocation = item?.locations?.find((loc) => loc.location_id)?.location_id;
    setSell({
      item_id: item ? String(item.id) : '',
      quantity: '1',
      unit_price: String(item?.unit_price || 0),
      location_id: String(firstLocation || locations[0]?.id || ''),
      party_type: 'student',
      party_id: '',
      party_name: '',
      doc_date: new Date().toISOString().slice(0, 10),
    });
    setPartyQuery('');
    setPartyHits([]);
    setSellOpen(true);
  };

  const selectedItem = stock.find((item) => String(item.id) === sell.item_id);
  const sellQty = Number(sell.quantity || 0);
  const sellRate = Number(sell.unit_price || 0);

  const submitSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sell.item_id) {
      await alert('Select an item to sell.', { title: 'Item required', type: 'error' });
      return;
    }
    if (sellQty < 1) {
      await alert('Enter a quantity of at least 1.', { title: 'Quantity required', type: 'error' });
      return;
    }
    if (selectedItem && sellQty > Number(selectedItem.quantity || 0)) {
      await alert('Quantity is more than available stock.', { title: 'Insufficient stock', type: 'error' });
      return;
    }
    if (!sell.party_name.trim()) {
      await alert('Enter the student, staff or department name.', { title: 'Name required', type: 'error' });
      return;
    }
    setSelling(true);
    try {
      const res = await fetch('/api/inventory/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'sale',
          doc_date: sell.doc_date,
          location_id: sell.location_id || null,
          party_type: sell.party_type,
          party_id: sell.party_id || null,
          party_name: sell.party_name.trim(),
          lines: [{ item_id: Number(sell.item_id), quantity: sellQty, unit_price: sellRate }],
        }),
      });
      const data = await res.json();
      if (!data.success) {
        await alert(data.error || 'Failed to create sale', { title: 'Error', type: 'error' });
        return;
      }
      const posted = await fetch(`/api/inventory/documents/${data.data.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post' }),
      });
      const postedData = await posted.json();
      if (!postedData.success) {
        await alert(postedData.error || 'Saved but could not post the sale', { title: 'Error', type: 'error' });
        return;
      }
      setSellOpen(false);
      await load(false);
      await alert(`Sold ${sellQty} × ${inventoryItemLabel(selectedItem || { item_name: 'item' })} for ₹ ${(sellQty * sellRate).toFixed(2)}.`, {
        title: 'Sale posted',
        type: 'success',
      });
    } finally {
      setSelling(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Inventory</h1>
            <p className="mt-1 text-sm text-gray-500">Stock, purchases, issues to students/staff and school assets.</p>
          </div>
          <button
            type="button"
            onClick={() => openSell()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
          >
            <FiShoppingCart size={14} /> Sell
          </button>
        </div>
        <InventoryModuleLinks />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {loading ? (
            <>
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
            </>
          ) : (
            <>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium">Items</p>
                    <p className="text-2xl font-semibold">{summary.totalItems}</p>
                  </div>
                  <FiPackage size={22} />
                </div>
              </div>
              <Link href="/inventory/alerts" className="rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium">Low stock</p>
                    <p className="text-2xl font-semibold">{summary.lowStock}</p>
                  </div>
                  <FiAlertCircle size={22} />
                </div>
              </Link>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-700">
                <p className="text-[11px] font-medium">Stock value</p>
                <p className="text-2xl font-semibold">₹ {Number(summary.stockValue || 0).toFixed(2)}</p>
              </div>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-center text-sm hover:border-primary-300">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Current stock</p>
              <p className="text-xs text-gray-500">
                {loading ? 'Loading stock…' : `${rows.length} of ${stock.length} items`}
              </p>
            </div>
            <div className="relative sm:w-72">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item, size, code…"
                className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
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
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <StockTableSkeleton />
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                      {stock.length === 0 ? 'No stock items yet' : 'No items match this search'}
                    </td>
                  </tr>
                ) : (
                  rows.map((item, index) => {
                    const qty = Number(item.quantity || 0);
                    const min = Number(item.min_stock_level || 0);
                    const rate = Number(item.unit_price || 0);
                    const low = qty <= min;
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-900">{inventoryItemLabel(item)}</p>
                          <p className="text-xs text-gray-500">{locationLabel(item)}</p>
                        </td>
                        <td className="px-3 py-2">{item.size || '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{item.item_code || item.barcode || '—'}</td>
                        <td className="px-3 py-2">{item.category_name || '—'}</td>
                        <td className={`px-3 py-2 ${low ? 'font-medium text-red-600' : ''}`}>
                          {qty} {item.unit || ''}
                          {low ? <span className="ml-2 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] uppercase text-red-700">Low</span> : null}
                        </td>
                        <td className="px-3 py-2">{min}</td>
                        <td className="px-3 py-2">₹ {rate.toFixed(2)}</td>
                        <td className="px-3 py-2">₹ {(qty * rate).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            disabled={qty < 1}
                            onClick={() => openSell(item)}
                            className="rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Sell
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {sellOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitSell} className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-medium text-gray-900">Quick sell</h2>
              <button type="button" onClick={() => setSellOpen(false)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
                <FiX size={18} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-gray-600">Item</span>
                <select
                  required
                  value={sell.item_id}
                  onChange={(e) => {
                    const item = stock.find((row) => String(row.id) === e.target.value);
                    setSell((prev) => ({
                      ...prev,
                      item_id: e.target.value,
                      unit_price: String(item?.unit_price || 0),
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="">Select item</option>
                  {stock.map((item) => (
                    <option key={item.id} value={item.id} disabled={Number(item.quantity) < 1}>
                      {inventoryItemLabel(item)} — stock {item.quantity} — ₹{Number(item.unit_price || 0).toFixed(0)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-600">Quantity</span>
                <input
                  type="number"
                  min={1}
                  max={selectedItem ? Number(selectedItem.quantity) : undefined}
                  required
                  value={sell.quantity}
                  onChange={(e) => setSell((p) => ({ ...p, quantity: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-600">Rate (₹)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={sell.unit_price}
                  onChange={(e) => setSell((p) => ({ ...p, unit_price: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-600">Date</span>
                <input
                  type="date"
                  required
                  value={sell.doc_date}
                  onChange={(e) => setSell((p) => ({ ...p, doc_date: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-600">Store</span>
                <select
                  value={sell.location_id}
                  onChange={(e) => setSell((p) => ({ ...p, location_id: e.target.value }))}
                  className={inputClass}
                >
                  {locations.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-600">Sell to</span>
                <select
                  value={sell.party_type}
                  onChange={(e) => {
                    setSell((p) => ({ ...p, party_type: e.target.value, party_id: '', party_name: '' }));
                    setPartyQuery('');
                  }}
                  className={inputClass}
                >
                  {PARTY_TYPES.map((type) => (
                    <option key={type} value={type} className="capitalize">{type}</option>
                  ))}
                </select>
              </label>
              <label className="relative text-sm">
                <span className="mb-1 block font-medium text-gray-600">Name</span>
                <input
                  required
                  value={partyQuery || sell.party_name}
                  onChange={(e) => {
                    setPartyQuery(e.target.value);
                    setSell((p) => ({ ...p, party_name: e.target.value, party_id: '' }));
                  }}
                  placeholder={`Search ${sell.party_type}`}
                  className={inputClass}
                />
                {partyHits.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border bg-white shadow">
                    {partyHits.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                          onClick={() => {
                            setSell((p) => ({ ...p, party_id: String(hit.id), party_name: hit.name }));
                            setPartyQuery('');
                            setPartyHits([]);
                          }}
                        >
                          {hit.name} {hit.code ? <span className="text-xs text-gray-500">({hit.code})</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </label>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Total: <span className="font-medium text-gray-900">₹ {(sellQty * sellRate).toFixed(2)}</span>
              {selectedItem ? ` · available ${selectedItem.quantity} ${selectedItem.unit || ''}` : ''}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSellOpen(false)} className="rounded-lg border px-3 py-2 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={selling}
                className="rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {selling ? 'Posting…' : 'Sell now'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
