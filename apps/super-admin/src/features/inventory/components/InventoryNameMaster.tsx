'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import InventoryModuleLinks from './InventoryModuleLinks';

interface Row {
  id: number;
  name: string;
  [key: string]: unknown;
}

export default function InventoryNameMaster({
  title,
  description,
  endpoint,
  extraFields = [],
}: {
  title: string;
  description: string;
  endpoint: string;
  extraFields?: { key: string; placeholder: string }[];
}) {
  const { alert, confirm } = useDialog();
  const [rows, setRows] = useState<Row[]>([]);
  const empty = Object.fromEntries([['name', ''], ...extraFields.map((f) => [f.key, ''])]) as Record<string, string>;
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(endpoint, { cache: 'no-store' });
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(endpoint, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to save', { title: 'Error', type: 'error' });
      return;
    }
    setForm(empty);
    setEditingId(null);
    load();
  };

  const remove = async (row: Row) => {
    const ok = await confirm(`Delete "${row.name}"?`, { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    await fetch(`${endpoint}?id=${row.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <InventoryModuleLinks />
        <form onSubmit={save} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-6">
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Name"
            className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
            required
          />
          {extraFields.map((field) => (
            <input
              key={field.key}
              value={form[field.key] || ''}
              onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
            />
          ))}
          <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white">
            <FiPlus size={14} /> {editingId ? 'Update' : 'Add'}
          </button>
        </form>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Name</th>
                {extraFields.map((field) => (
                  <th key={field.key} className="px-3 py-2">{field.placeholder}</th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3 + extraFields.length} className="px-3 py-8 text-center text-gray-500">
                    No records yet
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    {extraFields.map((field) => (
                      <td key={field.key} className="px-3 py-2 text-gray-600">
                        {String(row[field.key] || '—')}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(row.id);
                          setForm({
                            name: row.name,
                            ...Object.fromEntries(extraFields.map((f) => [f.key, String(row[f.key] || '')])),
                          });
                        }}
                        className="mr-3 text-sm text-primary-700 hover:underline"
                      >
                        Modify
                      </button>
                      <button type="button" onClick={() => remove(row)} className="text-red-600">
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
    </DashboardLayout>
  );
}
