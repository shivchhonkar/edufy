'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import LibraryMasterLinks from '@/features/library/components/LibraryMasterLinks';

interface Vendor {
  id: number;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

const EMPTY = { name: '', contact_person: '', phone: '', email: '', address: '' };

export default function VendorMasterPage() {
  const { alert, confirm } = useDialog();
  const [rows, setRows] = useState<Vendor[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/library/vendors');
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/library/vendors', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to save vendor', { title: 'Error', type: 'error' });
      return;
    }
    setForm(EMPTY);
    setEditingId(null);
    load();
  };

  const remove = async (row: Vendor) => {
    const ok = await confirm(`Delete vendor "${row.name}"?`, { type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    await fetch(`/api/library/vendors?id=${row.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Vendors</h1>
          <p className="mt-1 text-sm text-gray-500">Add, modify, delete and list book suppliers.</p>
        </div>
        {/* <LibraryModuleLinks /> */}
        <LibraryMasterLinks />
        <form onSubmit={save} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-6">
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Vendor name" className="rounded-lg border px-3 py-2 text-sm sm:col-span-2" required />
          <input value={form.contact_person} onChange={(e) => setForm((p) => ({ ...p, contact_person: e.target.value }))} placeholder="Contact person" className="rounded-lg border px-3 py-2 text-sm sm:col-span-2" />
          <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="rounded-lg border px-3 py-2 text-sm" />
          <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded-lg border px-3 py-2 text-sm" />
          <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className="rounded-lg border px-3 py-2 text-sm sm:col-span-4" />
          <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white sm:col-span-2">
            <FiPlus size={14} /> {editingId ? 'Update' : 'Add'}
          </button>
        </form>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">No vendors yet</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2">{row.contact_person || '—'}</td>
                    <td className="px-3 py-2">{row.phone || '—'}</td>
                    <td className="px-3 py-2">{row.email || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(row.id);
                          setForm({
                            name: row.name,
                            contact_person: row.contact_person || '',
                            phone: row.phone || '',
                            email: row.email || '',
                            address: row.address || '',
                          });
                        }}
                        className="mr-3 text-sm text-primary-700 hover:underline"
                      >
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
