'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import AppModal, { AppModalShell } from '@/shared/components/common/AppModal';
import { useDialog } from '@/shared/context/DialogContext';
import { inventoryItemLabel } from '../item-label';
import { printInventoryInvoice } from '../print-invoice';
import type { FeeReceiptSettings } from '@/features/fees/utils/fee-receipt-print';

type Item = {
  id: number;
  item_name: string;
  item_code?: string;
  unit?: string;
  unit_price?: number;
  quantity?: number;
  size?: string | null;
};
type Location = { id: number; name: string };
type PartyHit = { id: number; name: string; code?: string };
type Line = { item_id: string; quantity: string; unit_price: string };

const PARTY_TYPES = ['student', 'staff', 'department'];
const EMPTY_LINE: Line = { item_id: '', quantity: '1', unit_price: '0' };
const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';

export default function InventorySellModal({
  open,
  onClose,
  onSaved,
  items,
  locations,
  receiptSettings,
  initialItemId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  items: Item[];
  locations: Location[];
  receiptSettings?: FeeReceiptSettings;
  initialItemId?: string;
}) {
  const { alert } = useDialog();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    doc_date: new Date().toISOString().slice(0, 10),
    location_id: '',
    party_type: 'student',
    party_id: '',
    party_name: '',
    remarks: '',
  });
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const [partyQuery, setPartyQuery] = useState('');
  const [partyHits, setPartyHits] = useState<PartyHit[]>([]);

  useEffect(() => {
    if (!open) return;
    const firstItem = initialItemId ? items.find((item) => String(item.id) === String(initialItemId)) : null;
    setForm({
      doc_date: new Date().toISOString().slice(0, 10),
      location_id: String(locations[0]?.id || ''),
      party_type: 'student',
      party_id: '',
      party_name: '',
      remarks: '',
    });
    setLines([
      firstItem
        ? { item_id: String(firstItem.id), quantity: '1', unit_price: String(firstItem.unit_price || 0) }
        : { ...EMPTY_LINE },
    ]);
    setPartyQuery('');
    setPartyHits([]);
  }, [open, initialItemId, items, locations]);

  useEffect(() => {
    if (!open || partyQuery.trim().length < 1) {
      setPartyHits([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/inventory/parties?type=${form.party_type}&q=${encodeURIComponent(partyQuery)}`);
      const data = await res.json();
      if (data.success) setPartyHits(data.data || []);
    }, 200);
    return () => clearTimeout(timer);
  }, [partyQuery, form.party_type, open]);

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0), 0),
    [lines]
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines
      .map((line) => ({
        item_id: Number(line.item_id),
        quantity: Number(line.quantity || 0),
        unit_price: Number(line.unit_price || 0),
      }))
      .filter((line) => line.item_id && line.quantity > 0);
    if (!validLines.length) {
      await alert('Add at least one item to sell.', { title: 'Missing items', type: 'error' });
      return;
    }
    if (!form.party_name.trim()) {
      await alert('Enter the student, staff or department name.', { title: 'Name required', type: 'error' });
      return;
    }
    for (const line of validLines) {
      const item = items.find((row) => row.id === line.item_id);
      if (item && line.quantity > Number(item.quantity || 0)) {
        await alert(`Insufficient stock for ${inventoryItemLabel(item)}.`, { title: 'Insufficient stock', type: 'error' });
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'sale',
          doc_date: form.doc_date,
          location_id: form.location_id || null,
          party_type: form.party_type,
          party_id: form.party_id || null,
          party_name: form.party_name.trim(),
          remarks: form.remarks,
          lines: validLines,
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
      onSaved();
      onClose();
      const invoiceRes = await fetch(`/api/inventory/documents/${data.data.id}`, { cache: 'no-store' });
      const invoiceData = await invoiceRes.json();
      if (invoiceData.success) {
        printInventoryInvoice(invoiceData.data, receiptSettings);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal open={open} onClose={onClose}>
      <AppModalShell
        header={
          <>
            <div>
              <h2 className="text-lg text-gray-900">Sell items</h2>
              <p className="mt-0.5 text-sm text-gray-500">Choose the buyer, items and rates. Posting reduces stock and prints the invoice.</p>
            </div>
            <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
              <FiX size={22} />
            </button>
          </>
        }
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="inventory-sell-form"
              disabled={saving}
              className="w-full rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 sm:w-auto"
            >
              {saving ? 'Posting…' : `Sell now · ₹ ${total.toFixed(2)}`}
            </button>
          </>
        }
      >
        <form id="inventory-sell-form" onSubmit={save} className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-600">Date</span>
              <input type="date" required value={form.doc_date} onChange={(e) => setForm((p) => ({ ...p, doc_date: e.target.value }))} className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-600">Store</span>
              <select value={form.location_id} onChange={(e) => setForm((p) => ({ ...p, location_id: e.target.value }))} className={inputClass}>
                {locations.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-600">Sell to</span>
              <select
                value={form.party_type}
                onChange={(e) => {
                  setForm((p) => ({ ...p, party_type: e.target.value, party_id: '', party_name: '' }));
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
                value={partyQuery || form.party_name}
                onChange={(e) => {
                  setPartyQuery(e.target.value);
                  setForm((p) => ({ ...p, party_name: e.target.value, party_id: '' }));
                }}
                placeholder={`Search ${form.party_type}`}
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
                          setForm((p) => ({ ...p, party_id: String(hit.id), party_name: hit.name }));
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
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-gray-600">Remarks</span>
              <input value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} className={inputClass} />
            </label>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="w-24 px-3 py-2">Qty</th>
                  <th className="w-28 px-3 py-2">Rate (₹)</th>
                  <th className="w-28 px-3 py-2">Amount</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const item = items.find((row) => String(row.id) === line.item_id);
                  const amount = Number(line.quantity || 0) * Number(line.unit_price || 0);
                  return (
                    <tr key={index} className="border-t">
                      <td className="px-3 py-2">
                        <select
                          required
                          value={line.item_id}
                          onChange={(e) => {
                            const next = items.find((row) => String(row.id) === e.target.value);
                            setLines((prev) =>
                              prev.map((row, i) =>
                                i === index
                                  ? { ...row, item_id: e.target.value, unit_price: String(next?.unit_price || 0) }
                                  : row
                              )
                            );
                          }}
                          className={inputClass}
                        >
                          <option value="">Select item</option>
                          {items.map((row) => (
                            <option key={row.id} value={row.id} disabled={Number(row.quantity) < 1}>
                              {inventoryItemLabel(row)} — stock {row.quantity ?? 0} — ₹{Number(row.unit_price || 0).toFixed(0)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={item ? Number(item.quantity) : undefined}
                          required
                          value={line.quantity}
                          onChange={(e) => setLines((prev) => prev.map((row, i) => (i === index ? { ...row, quantity: e.target.value } : row)))}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          required
                          value={line.unit_price}
                          onChange={(e) => setLines((prev) => prev.map((row, i) => (i === index ? { ...row, unit_price: e.target.value } : row)))}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">₹ {amount.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        {lines.length > 1 && (
                          <button type="button" className="text-red-600" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} aria-label="Remove line">
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"
          >
            <FiPlus size={14} /> Add item
          </button>
        </form>
      </AppModalShell>
    </AppModal>
  );
}
