'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import AlumniSelectField from '@/features/alumni/components/AlumniSelectField';
import {
  HIGHER_ED_STATUS_OPTIONS,
  higherEdStatusLabel,
  type AlumniHigherEducation,
} from '@/lib/alumni-utils';
import { useDialog } from '@/shared/context/DialogContext';
import { FiEdit2, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi';

const emptyForm = {
  student_id: '',
  institution_name: '',
  degree: '',
  field_of_study: '',
  start_year: '',
  end_year: '',
  status: 'studying',
  country: '',
  city: '',
  remarks: '',
};

export default function AlumniHigherEducationTab() {
  const { alert, confirm } = useDialog();
  const [items, setItems] = useState<AlumniHigherEducation[]>([]);
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
      const response = await fetch(`/api/alumni/higher-education?${params}`);
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

  const openEdit = (item: AlumniHigherEducation) => {
    setEditId(item.id);
    setForm({
      student_id: String(item.student_id),
      institution_name: item.institution_name,
      degree: item.degree || '',
      field_of_study: item.field_of_study || '',
      start_year: item.start_year ? String(item.start_year) : '',
      end_year: item.end_year ? String(item.end_year) : '',
      status: item.status,
      country: item.country || '',
      city: item.city || '',
      remarks: item.remarks || '',
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.student_id || !form.institution_name.trim()) {
      await alert('Alumni and institution are required', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        start_year: form.start_year ? parseInt(form.start_year, 10) : null,
        end_year: form.end_year ? parseInt(form.end_year, 10) : null,
      };
      const response = await fetch(
        editId ? `/api/alumni/higher-education/${editId}` : '/api/alumni/higher-education',
        {
          method: editId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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
    const ok = await confirm('Delete this higher education record?', { type: 'warning' });
    if (!ok) return;
    await fetch(`/api/alumni/higher-education/${id}`, { method: 'DELETE' });
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
            placeholder="Search institution, alumni..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 text-sm flex items-center gap-2"
        >
          <FiPlus size={14} />
          Add Record
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-sm border rounded-lg bg-gray-50">
          No higher education records yet.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2">Alumni</th>
                <th className="text-left px-4 py-2">Institution</th>
                <th className="text-left px-4 py-2">Degree / Field</th>
                <th className="text-left px-4 py-2">Years</th>
                <th className="text-left px-4 py-2">Status</th>
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
                  <td className="px-4 py-2">{item.institution_name}</td>
                  <td className="px-4 py-2">
                    {item.degree || '—'}
                    {item.field_of_study ? ` · ${item.field_of_study}` : ''}
                  </td>
                  <td className="px-4 py-2">
                    {item.start_year || '—'} – {item.end_year || '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {higherEdStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button type="button" onClick={() => openEdit(item)} className="text-primary-600 text-xs inline-flex items-center gap-1">
                      <FiEdit2 size={12} /> Edit
                    </button>
                    <button type="button" onClick={() => remove(item.id)} className="text-red-600 text-xs inline-flex items-center gap-1">
                      <FiTrash2 size={12} /> Delete
                    </button>
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
            <h3 className="text-lg font-medium">{editId ? 'Edit' : 'Add'} Higher Education</h3>
            <button type="button" onClick={() => setShowModal(false)}><FiX /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!editId && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Alumni</label>
                <AlumniSelectField value={form.student_id} onChange={(v) => setForm((p) => ({ ...p, student_id: v }))} required />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Institution</label>
              <input value={form.institution_name} onChange={(e) => setForm((p) => ({ ...p, institution_name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <input placeholder="Degree" value={form.degree} onChange={(e) => setForm((p) => ({ ...p, degree: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Field of study" value={form.field_of_study} onChange={(e) => setForm((p) => ({ ...p, field_of_study: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Start year" value={form.start_year} onChange={(e) => setForm((p) => ({ ...p, start_year: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="End year" value={form.end_year} onChange={(e) => setForm((p) => ({ ...p, end_year: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm">
              {HIGHER_ED_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input placeholder="Country" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="City" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
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