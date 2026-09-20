'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import AlumniSelectField from '@/features/alumni/components/AlumniSelectField';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  employmentTypeLabel,
  type AlumniEmployment,
} from '@/lib/alumni-utils';
import { useDialog } from '@/shared/context/DialogContext';
import { FiEdit2, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi';

const emptyForm = {
  student_id: '',
  company_name: '',
  job_title: '',
  industry: '',
  employment_type: 'full_time',
  start_date: '',
  end_date: '',
  is_current: true,
  location: '',
  remarks: '',
};

export default function AlumniEmploymentTab() {
  const { alert, confirm } = useDialog();
  const [items, setItems] = useState<AlumniEmployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (search) params.set('search', search);
      const response = await fetch(`/api/alumni/employment?${params}`);
      const data = await response.json();
      if (data.success) setItems(data.data.items);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: AlumniEmployment) => {
    setEditId(item.id);
    setForm({
      student_id: String(item.student_id),
      company_name: item.company_name,
      job_title: item.job_title || '',
      industry: item.industry || '',
      employment_type: item.employment_type,
      start_date: item.start_date ? String(item.start_date).slice(0, 10) : '',
      end_date: item.end_date ? String(item.end_date).slice(0, 10) : '',
      is_current: item.is_current,
      location: item.location || '',
      remarks: item.remarks || '',
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.student_id || !form.company_name.trim()) {
      await alert('Alumni and company are required', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(
        editId ? `/api/alumni/employment/${editId}` : '/api/alumni/employment',
        {
          method: editId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      );
      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        load();
      } else {
        await alert(data.error || 'Failed to save', { type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const ok = await confirm('Delete this employment record?', { type: 'warning' });
    if (!ok) return;
    await fetch(`/api/alumni/employment/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, role, alumni..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button type="button" onClick={openCreate} className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <FiPlus size={14} /> Add Employment
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-sm border rounded-lg bg-gray-50">No employment records yet.</div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2">Alumni</th>
                <th className="text-left px-4 py-2">Company</th>
                <th className="text-left px-4 py-2">Role</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Period</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <p className="font-medium">{item.alumni_name}</p>
                    <p className="text-xs text-gray-500">{item.admission_number}</p>
                  </td>
                  <td className="px-4 py-2">{item.company_name}</td>
                  <td className="px-4 py-2">{item.job_title || '—'}</td>
                  <td className="px-4 py-2">{employmentTypeLabel(item.employment_type)}</td>
                  <td className="px-4 py-2">
                    {item.start_date ? new Date(item.start_date).toLocaleDateString('en-IN') : '—'}
                    {' – '}
                    {item.is_current ? 'Present' : item.end_date ? new Date(item.end_date).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button type="button" onClick={() => openEdit(item)} className="text-primary-600 text-xs inline-flex items-center gap-1"><FiEdit2 size={12} /> Edit</button>
                    <button type="button" onClick={() => remove(item.id)} className="text-red-600 text-xs inline-flex items-center gap-1"><FiTrash2 size={12} /> Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AppModal open={showModal} onClose={() => setShowModal(false)}>
        <div className={APP_MODAL_PANEL}>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{editId ? 'Edit' : 'Add'} Employment</h3>
            <button type="button" onClick={() => setShowModal(false)}><FiX /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!editId && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Alumni</label>
                <AlumniSelectField value={form.student_id} onChange={(v) => setForm((p) => ({ ...p, student_id: v }))} required />
              </div>
            )}
            <input placeholder="Company" value={form.company_name} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))} className="sm:col-span-2 px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Job title" value={form.job_title} onChange={(e) => setForm((p) => ({ ...p, job_title: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Industry" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <select value={form.employment_type} onChange={(e) => setForm((p) => ({ ...p, employment_type: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm">
              {EMPLOYMENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input placeholder="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} disabled={form.is_current} className="px-3 py-2 border rounded-lg text-sm disabled:bg-gray-50" />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={form.is_current} onChange={(e) => setForm((p) => ({ ...p, is_current: e.target.checked, end_date: e.target.checked ? '' : p.end_date }))} />
              Currently working here
            </label>
            <textarea placeholder="Remarks" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} rows={2} className="sm:col-span-2 w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
        </div>
      </AppModal>
    </div>
  );
}
