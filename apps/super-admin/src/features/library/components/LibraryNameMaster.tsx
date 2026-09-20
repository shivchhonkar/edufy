'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import LibraryModuleLinks from './LibraryModuleLinks';
import LibraryMasterLinks from './LibraryMasterLinks';

interface MasterRow {
  id: number;
  name: string;
  remarks?: string | null;
  is_active: boolean;
}

interface LibraryNameMasterProps {
  title: string;
  description: string;
  endpoint: string;
  placeholder?: string;
}

export default function LibraryNameMaster({
  title,
  description,
  endpoint,
  placeholder = 'Name',
}: LibraryNameMasterProps) {
  const { alert, confirm } = useDialog();
  const [rows, setRows] = useState<MasterRow[]>([]);
  const [form, setForm] = useState({ name: '', remarks: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(endpoint);
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
    setForm({ name: '', remarks: '' });
    setEditingId(null);
    load();
  };

  const edit = (row: MasterRow) => {
    setEditingId(row.id);
    setForm({ name: row.name, remarks: row.remarks || '' });
  };

  const remove = async (row: MasterRow) => {
    const ok = await confirm(`Delete "${row.name}"?`, { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    const res = await fetch(`${endpoint}?id=${row.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to delete', { title: 'Error', type: 'error' });
      return;
    }
    if (editingId === row.id) {
      setEditingId(null);
      setForm({ name: '', remarks: '' });
    }
    load();
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        {/* <LibraryModuleLinks /> */}
        <LibraryMasterLinks />
        <form onSubmit={save} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-6">
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder={placeholder}
            className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
            required
          />
          <input
            value={form.remarks}
            onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
            placeholder="Remarks"
            className="rounded-lg border px-3 py-2 text-sm sm:col-span-3"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white"
          >
            <FiPlus size={14} /> {editingId ? 'Update' : 'Add'}
          </button>
        </form>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Remarks</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                    No records yet
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 text-gray-600">{row.remarks || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => edit(row)} className="mr-3 text-sm text-primary-700 hover:underline">
                        Modify
                      </button>
                      <button type="button" onClick={() => remove(row)} className="text-red-600" aria-label="Delete">
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
