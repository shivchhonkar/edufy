'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import LibraryMasterLinks from '@/features/library/components/LibraryMasterLinks';

export default function CategoriesPage() {
  const [items, setItems] = useState<Array<{ id: number; name: string }>>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const { alert, confirm } = useDialog();

  const load = useCallback(async () => {
    const res = await fetch('/api/library/categories');
    const data = await res.json();
    if (data.success) setItems(data.data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!name.trim()) {
      await alert('Name required', { title: 'Validation' });
      return;
    }
    const res = editingId
      ? await fetch(`/api/library/categories/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
      : await fetch('/api/library/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed', { title: 'Error', type: 'error' });
      return;
    }
    setName('');
    setEditingId(null);
    load();
  };

  const remove = async (id: number) => {
    const ok = await confirm('Delete category?', { title: 'Confirm', type: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    const res = await fetch(`/api/library/categories/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) load();
    else await alert(data.error || 'Failed');
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Categories</h1>
        </div>
        {/* <LibraryModuleLinks /> */}
        <LibraryMasterLinks />
        <div className="flex gap-2 rounded-xl border border-gray-200 bg-white p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button type="button" onClick={save} className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white">
            <FiPlus size={14} /> {editingId ? 'Update' : 'Add'}
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <ul className="divide-y text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-4 py-2">
                <span>{item.name}</span>
                <span>
                  <button type="button" onClick={() => { setEditingId(item.id); setName(item.name); }} className="mr-3 text-primary-700 hover:underline">
                    Modify
                  </button>
                  <button type="button" onClick={() => remove(item.id)} className="text-red-600" aria-label="Delete">
                    <FiTrash2 size={16} />
                  </button>
                </span>
              </li>
            ))}
            {items.length === 0 && <li className="px-4 py-8 text-center text-gray-500">No categories yet</li>}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
