'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useEffect, useState } from 'react';
import { useDialog } from '@/shared/context/DialogContext';

export default function CategoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const { alert, confirm } = useDialog();

  const load = async () => {
    try {
      const res = await fetch('/api/library/categories');
      const d = await res.json();
      if (d.success) setItems(d.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return alert('Name required', { title: 'Validation' });
    const res = await fetch('/api/library/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const d = await res.json();
    if (d.success) { setName(''); load(); }
    else await alert(d.error || 'Failed');
  };

  const remove = async (id: number) => {
    const ok = await confirm('Delete category?', { title: 'Confirm' });
    if (!ok) return;
    const res = await fetch(`/api/library/categories/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) load(); else await alert(d.error || 'Failed');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Categories</h1>
        <div className="bg-white border rounded-lg p-4 mb-4">
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" className="px-3 py-2 border rounded-lg flex-1" />
            <button onClick={create} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Add</button>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <ul className="space-y-2 text-sm">
            {items.map((c) => (
              <li key={c.id} className="flex justify-between items-center">
                <span>{c.name}</span>
                <button onClick={() => remove(c.id)} className="text-sm text-red-600">Delete</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
