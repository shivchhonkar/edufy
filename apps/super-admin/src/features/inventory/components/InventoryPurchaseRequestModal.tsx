'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import AppModal, { AppModalShell } from '@/shared/components/common/AppModal';
import { useDialog } from '@/shared/context/DialogContext';
import { inventoryItemLabel } from '../item-label';

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
type Vendor = { id: number; name: string };
type Line = { item_id: string; quantity: string };

const EMPTY_LINE: Line = { item_id: '', quantity: '1' };
const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';

export default function InventoryPurchaseRequestModal({
  open,
  onClose,
  onSaved,
  items,
  locations,
  vendors,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  items: Item[];
  locations: Location[];
  vendors: Vendor[];
}) {
  const { alert } = useDialog();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    doc_date: new Date().toISOString().slice(0, 10),
    location_id: '',
    vendor_id: '',
    remarks: '',
  });
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);

  useEffect(() => {
    if (!open) return;
    setForm({
      doc_date: new Date().toISOString().slice(0, 10),
      location_id: String(locations[0]?.id || ''),
      vendor_id: '',
      remarks: '',
    });
    setLines([{ ...EMPTY_LINE }]);
  }, [open, locations]);

  const save = async (approveAfter: boolean) => {
    const validLines = lines
      .map((line) => ({
        item_id: Number(line.item_id),
        quantity: Number(line.quantity || 0),
        unit_price: 0,
      }))
      .filter((line) => line.item_id && line.quantity > 0);
    if (!validLines.length) {
      await alert('Add at least one item to the request.', { title: 'Missing items', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'pr',
          doc_date: form.doc_date,
          location_id: form.location_id || null,
          vendor_id: form.vendor_id || null,
          remarks: form.remarks,
          lines: validLines,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        await alert(data.error || 'Failed to create purchase request', { title: 'Error', type: 'error' });
        return;
      }
      if (approveAfter) {
        const approved = await fetch(`/api/inventory/documents/${data.data.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        });
        const approvedData = await approved.json();
        if (!approvedData.success) {
          await alert(approvedData.error || 'Saved but could not approve', { title: 'Error', type: 'error' });
          onSaved();
          onClose();
          return;
        }
      }
      onSaved();
      onClose();
      await alert(
        approveAfter ? 'Purchase request saved and approved.' : 'Purchase request saved as draft.',
        { title: approveAfter ? 'Approved' : 'Saved', type: 'success' }
      );
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
              <h2 className="text-lg text-gray-900">New purchase request</h2>
              <p className="mt-0.5 text-sm text-gray-500">Select store, vendor and items that need to be purchased.</p>
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
              type="button"
              disabled={saving}
              onClick={() => save(false)}
              className="w-full rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="submit"
              form="inventory-pr-form"
              disabled={saving}
              className="w-full rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 sm:w-auto"
            >
              {saving ? 'Saving…' : 'Save & approve'}
            </button>
          </>
        }
      >
        <form
          id="inventory-pr-form"
          onSubmit={(e) => {
            e.preventDefault();
            save(true);
          }}
          className="space-y-4 p-4 sm:p-6"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-600">Date</span>
              <input
                type="date"
                required
                value={form.doc_date}
                onChange={(e) => setForm((p) => ({ ...p, doc_date: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-600">Store</span>
              <select
                value={form.location_id}
                onChange={(e) => setForm((p) => ({ ...p, location_id: e.target.value }))}
                className={inputClass}
              >
                {locations.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-gray-600">Vendor</span>
              <select
                value={form.vendor_id}
                onChange={(e) => setForm((p) => ({ ...p, vendor_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select vendor</option>
                {vendors.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-gray-600">Remarks</span>
              <input
                value={form.remarks}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                className={inputClass}
                placeholder="Optional notes"
              />
            </label>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="w-28 px-3 py-2">Qty</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-3 py-2">
                      <select
                        required
                        value={line.item_id}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((row, i) => (i === index ? { ...row, item_id: e.target.value } : row))
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">Select item</option>
                        {items.map((row) => (
                          <option key={row.id} value={row.id}>
                            {inventoryItemLabel(row)}
                            {row.item_code ? ` (${row.item_code})` : ''}
                            {` — stock ${row.quantity ?? 0}`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        required
                        value={line.quantity}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((row, i) => (i === index ? { ...row, quantity: e.target.value } : row))
                          )
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          className="text-red-600"
                          onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                          aria-label="Remove line"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
