'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

interface Designation {
  id: number;
  name: string;
  grade: number;
  department_id: number | null;
  department_name: string;
  min_salary: number;
  max_salary: number;
  is_active: boolean;
}

interface Department { id: number; name: string; }

export default function DesignationsPage() {
  const { alert, confirm } = useDialog();
  const [items, setItems] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [form, setForm] = useState({ name: '', grade: 1, department_id: '', min_salary: '', max_salary: '', is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const [desRes, deptRes] = await Promise.all([
      fetch('/api/designations'),
      fetch('/api/departments?active_only=true'),
    ]);
    const [desData, deptData] = await Promise.all([desRes.json(), deptRes.json()]);
    if (desData.success) setItems(desData.data);
    if (deptData.success) setDepartments(deptData.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', grade: 1, department_id: '', min_salary: '', max_salary: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (d: Designation) => {
    setEditing(d);
    setForm({
      name: d.name, grade: d.grade, department_id: d.department_id ? String(d.department_id) : '',
      min_salary: d.min_salary ? String(d.min_salary) : '', max_salary: d.max_salary ? String(d.max_salary) : '',
      is_active: d.is_active,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name, grade: form.grade,
      department_id: form.department_id ? parseInt(form.department_id, 10) : null,
      min_salary: form.min_salary ? parseFloat(form.min_salary) : null,
      max_salary: form.max_salary ? parseFloat(form.max_salary) : null,
      is_active: form.is_active,
    };
    const url = editing ? `/api/designations/${editing.id}` : '/api/designations';
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    setSaving(false);
    if (data.success) { setShowModal(false); fetchItems(); }
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  const remove = async (d: Designation) => {
    const ok = await confirm(`Delete designation "${d.name}"?`, { title: 'Confirm', type: 'warning' });
    if (!ok) return;
    const res = await fetch(`/api/designations/${d.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchItems();
    else await alert(data.error, { title: 'Error', type: 'error' });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <HrNav />
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl">Designations</h1>
          <button type="button" onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"><FiPlus /> Add Designation</button>
        </div>
        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0 z-10 shrink-0">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Department</th>
                <th className="text-left px-5 py-3">Grade</th>
                <th className="text-left px-5 py-3">Salary Range</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
              : items.map((d) => (
                <tr key={d.id} className="border-b hover:bg-gray-50 sticky top-0 z-10 shrink-0">
                  <td className="px-5 py-3 font-medium">{d.name}</td>
                  <td className="px-5 py-3">{d.department_name || '—'}</td>
                  <td className="px-5 py-3">{d.grade}</td>
                  <td className="px-5 py-3">
                    {d.min_salary || d.max_salary ? `₹${d.min_salary || 0} – ₹${d.max_salary || 0}` : '—'}
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
          <AppModal open={showModal} onClose={() => setShowModal(false)}>
            <div className={APP_MODAL_PANEL+ " p-6"} >
              <h2 className="text-lg mb-2">{editing ? 'Edit' : 'Add'} Designation</h2>
              <input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 mt-2" />
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 mt-2">
                <option value="">No department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input type="number" placeholder="Grade" value={form.grade} onChange={(e) => setForm({ ...form, grade: parseInt(e.target.value, 10) || 1 })} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 mt-2" />
              <div className="grid grid-cols-2 gap-2 mt-2 mb-2">
                <input placeholder="Min salary" value={form.min_salary} onChange={(e) => setForm({ ...form, min_salary: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Max salary" value={form.max_salary} onChange={(e) => setForm({ ...form, max_salary: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={save} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </AppModal>
        )}
      </div>
    </DashboardLayout>
  );
}
