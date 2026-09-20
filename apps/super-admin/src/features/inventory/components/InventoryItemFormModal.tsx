'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FiX } from 'react-icons/fi';
import AppModal, { AppModalShell } from '@/shared/components/common/AppModal';
import { useDialog } from '@/shared/context/DialogContext';

type Item = {
  id: number;
  item_name: string;
  item_code?: string;
  category_id?: number;
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
type SizeRow = { size: string; selected: boolean; quantity: string; unit_price: string };

const UNIFORM_SIZES = ['Small', 'Medium', 'Large', 'XL', 'XXL'];
const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm';

const EMPTY = {
  item_name: '',
  item_code: '',
  category_id: '',
  unit: 'pcs',
  quantity: '0',
  min_stock_level: '0',
  unit_price: '0',
  barcode: '',
  is_asset: false,
  description: '',
  size: '',
};

function emptySizeRows(): SizeRow[] {
  return UNIFORM_SIZES.map((size) => ({
    size,
    selected: size === 'Small' || size === 'Medium' || size === 'Large',
    quantity: '0',
    unit_price: '0',
  }));
}

function isUniformCategory(categories: Option[], categoryId: string) {
  const name = categories.find((row) => String(row.id) === String(categoryId))?.name || '';
  return /uniform/i.test(name);
}

function Field({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

export default function InventoryItemFormModal({
  open,
  onClose,
  onSaved,
  categories,
  units,
  item,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Option[];
  units: Option[];
  item?: Item | null;
}) {
  const { alert } = useDialog();
  const [form, setForm] = useState(EMPTY);
  const [sizeRows, setSizeRows] = useState<SizeRow[]>(emptySizeRows);
  const [customSize, setCustomSize] = useState('');
  const [saving, setSaving] = useState(false);
  const editingId = item?.id || null;
  const uniformSelected = isUniformCategory(categories, form.category_id);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        item_name: item.item_name,
        item_code: item.item_code || '',
        category_id: item.category_id ? String(item.category_id) : '',
        unit: item.unit || 'pcs',
        quantity: String(item.quantity || 0),
        min_stock_level: String(item.min_stock_level || 0),
        unit_price: String(item.unit_price || 0),
        barcode: item.barcode || '',
        is_asset: Boolean(item.is_asset),
        description: item.description || '',
        size: item.size || '',
      });
    } else {
      setForm({ ...EMPTY, unit: units[0]?.name || 'pcs' });
    }
    setSizeRows(emptySizeRows());
    setCustomSize('');
  }, [open, item, units]);

  const addCustomSize = () => {
    const size = customSize.trim();
    if (!size) return;
    setSizeRows((prev) => {
      const match = prev.find((row) => row.size.toLowerCase() === size.toLowerCase());
      if (match) {
        return prev.map((row) =>
          row.size.toLowerCase() === size.toLowerCase() ? { ...row, selected: true } : row
        );
      }
      return [...prev, { size, selected: true, quantity: '0', unit_price: '0' }];
    });
    setCustomSize('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSizes = sizeRows.filter((row) => row.selected);
    if (!editingId && uniformSelected && selectedSizes.length === 0) {
      await alert('Select at least one size for this uniform.', { title: 'Size required', type: 'error' });
      return;
    }
    const payload: Record<string, unknown> = {
      ...form,
      category_id: form.category_id || null,
      quantity: Number(form.quantity || 0),
      min_stock_level: Number(form.min_stock_level || 0),
      unit_price: Number(form.unit_price || 0),
      barcode: form.barcode || form.item_code,
      size: form.size || null,
    };
    if (!editingId && uniformSelected) {
      payload.sizes = selectedSizes.map((row) => ({
        size: row.size,
        quantity: Number(row.quantity || 0),
        unit_price: Number(row.unit_price || 0),
      }));
    }
    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/inventory/items/${editingId}` : '/api/inventory/items', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        await alert(data.error || 'Failed to save item', { title: 'Error', type: 'error' });
        return;
      }
      onSaved();
      onClose();
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
              <h2 className="text-lg text-gray-900">{editingId ? 'Modify item' : 'Add item'}</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {editingId
                  ? 'Update catalog details, size and rate for this item.'
                  : 'Enter item details. For uniforms, choose sizes with their own rates.'}
              </p>
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
              form="inventory-item-form"
              disabled={saving}
              className="w-full rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 sm:w-auto"
            >
              {saving ? 'Saving…' : editingId ? 'Update item' : 'Add item'}
            </button>
          </>
        }
      >
        <form id="inventory-item-form" onSubmit={save} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
          <Field label="Item name" className="sm:col-span-2">
            <input
              required
              autoFocus
              value={form.item_name}
              onChange={(e) => setForm((p) => ({ ...p, item_name: e.target.value }))}
              placeholder="e.g. School shirt"
              className={inputClass}
            />
          </Field>
          <Field label="Item code">
            <input
              value={form.item_code}
              onChange={(e) => setForm((p) => ({ ...p, item_code: e.target.value }))}
              placeholder="Auto if empty"
              className={inputClass}
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category_id}
              onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">Select category</option>
              {categories.map((row) => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Unit">
            <select
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              className={inputClass}
            >
              {units.map((row) => (
                <option key={row.id} value={row.name}>{row.name}</option>
              ))}
            </select>
          </Field>
          {editingId && uniformSelected && (
            <Field label="Size">
              <select
                value={form.size}
                onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select size</option>
                {UNIFORM_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
                {form.size && !UNIFORM_SIZES.includes(form.size) ? (
                  <option value={form.size}>{form.size}</option>
                ) : null}
              </select>
            </Field>
          )}
          {!(uniformSelected && !editingId) && (
            <>
              {!editingId && (
                <Field label="Opening quantity">
                  <input
                    type="number"
                    min={0}
                    value={form.quantity}
                    onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              )}
              <Field label="Minimum stock">
                <input
                  type="number"
                  min={0}
                  value={form.min_stock_level}
                  onChange={(e) => setForm((p) => ({ ...p, min_stock_level: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="Rate (₹)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) => setForm((p) => ({ ...p, unit_price: e.target.value }))}
                  className={inputClass}
                />
              </Field>
            </>
          )}
          {uniformSelected && !editingId && (
            <Field label="Minimum stock">
              <input
                type="number"
                min={0}
                value={form.min_stock_level}
                onChange={(e) => setForm((p) => ({ ...p, min_stock_level: e.target.value }))}
                className={inputClass}
              />
            </Field>
          )}
          <Field label="Asset" className={uniformSelected && !editingId ? '' : 'sm:col-span-2'}>
            <span className="flex h-[38px] items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={form.is_asset}
                onChange={(e) => setForm((p) => ({ ...p, is_asset: e.target.checked }))}
              />
              Track as a fixed asset
            </span>
          </Field>
          {uniformSelected && !editingId && (
            <div className="sm:col-span-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="mb-1 text-sm font-medium text-gray-700">Uniform sizes</p>
              <p className="mb-3 text-xs text-gray-500">
                Select each size you stock. Price and opening quantity can be different per size.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="py-1 pr-3">Use</th>
                      <th className="py-1 pr-3">Size</th>
                      <th className="py-1 pr-3">Opening quantity</th>
                      <th className="py-1">Rate (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeRows.map((row) => (
                      <tr key={row.size}>
                        <td className="py-1.5 pr-3">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) =>
                              setSizeRows((prev) =>
                                prev.map((entry) =>
                                  entry.size === row.size ? { ...entry, selected: e.target.checked } : entry
                                )
                              )
                            }
                          />
                        </td>
                        <td className="py-1.5 pr-3 font-medium">{row.size}</td>
                        <td className="py-1.5 pr-3">
                          <input
                            type="number"
                            min={0}
                            disabled={!row.selected}
                            value={row.quantity}
                            onChange={(e) =>
                              setSizeRows((prev) =>
                                prev.map((entry) =>
                                  entry.size === row.size ? { ...entry, quantity: e.target.value } : entry
                                )
                              )
                            }
                            className={`${inputClass} max-w-[8rem] disabled:bg-gray-100`}
                          />
                        </td>
                        <td className="py-1.5">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            disabled={!row.selected}
                            value={row.unit_price}
                            onChange={(e) =>
                              setSizeRows((prev) =>
                                prev.map((entry) =>
                                  entry.size === row.size ? { ...entry, unit_price: e.target.value } : entry
                                )
                              )
                            }
                            className={`${inputClass} max-w-[8rem] disabled:bg-gray-100`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Field label="Add another size" className="min-w-[10rem] flex-1">
                  <input
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSize();
                      }
                    }}
                    placeholder="e.g. 32 or Free size"
                    className={inputClass}
                  />
                </Field>
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={addCustomSize}
                >
                  Add size
                </button>
              </div>
            </div>
          )}
        </form>
      </AppModalShell>
    </AppModal>
  );
}
