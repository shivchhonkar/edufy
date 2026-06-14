'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  staff_count: number;
  head_name: string;
}

export default function DepartmentsPage() {
  const { alert, confirm } = useDialog();
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/departments');
    const data = await res.json();
    if (data.success) setItems(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', description: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ name: d.name, code: d.code || '', description: d.description || '', is_active: d.is_active });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const url = editing ? `/api/departments/${editing.id}` : '/api/departments';
    const res = await fetch(url, {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      setShowModal(false);
      fetchItems();
    } else {
      await alert(data.error || 'Failed to save', { title: 'Error', type: 'error' });
    }
  };

  const remove = async (d: Department) => {
    const ok = await confirm(`Delete department "${d.name}"?`, { title: 'Confirm', type: 'warning' });
    if (!ok) return;
    const res = await fetch(`/api/departments/${d.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchItems();
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <HrNav />
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl">Departments</h1>
          <button type="button" onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
            <FiPlus /> Add Department
          </button>
        </div>
        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Code</th>
                <th className="text-left px-5 py-3">Staff</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No departments yet</td></tr>
              ) : items.map((d) => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{d.name}</td>
                  <td className="px-5 py-3">{d.code || '—'}</td>
                  <td className="px-5 py-3">{d.staff_count ?? 0}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => openEdit(d)} className="p-1.5 text-gray-500 hover:text-primary-600"><FiEdit2 /></button>
                      <button type="button" onClick={() => remove(d)} className="p-1.5 text-gray-500 hover:text-red-600"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
              <h2 className="text-lg font-bold">{editing ? 'Edit' : 'Add'} Department</h2>
              <input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active
              </label>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={save} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
