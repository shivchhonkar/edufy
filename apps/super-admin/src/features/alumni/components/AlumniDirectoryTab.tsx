'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import { AdmissionNo } from '@/shared/context/AdmissionNumberFormatContext';
import { useDialog } from '@/shared/context/DialogContext';
import type { AlumniDirectoryItem } from '@/lib/alumni-utils';
import {
  FiEdit2,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiX,
} from 'react-icons/fi';

export default function AlumniDirectoryTab() {
  const { alert } = useDialog();
  const [items, setItems] = useState<AlumniDirectoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [selected, setSelected] = useState<AlumniDirectoryItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<AlumniDirectoryItem>>({});
  const [saving, setSaving] = useState(false);
  const [highestClass, setHighestClass] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '200' });
      if (search) params.set('search', search);
      if (batchYear) params.set('batch_year', batchYear);
      const response = await fetch(`/api/alumni?${params}`);
      const data = await response.json();
      if (data.success) {
        setItems(data.data.items);
        setTotal(data.data.total);
        setHighestClass(data.data.highest_class ?? null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search, batchYear]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSync = async () => {
    const response = await fetch('/api/alumni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync' }),
    });
    const data = await response.json();
    if (data.success) {
      await alert(`Synced ${data.data.synced} alumni profile(s).`, { type: 'success' });
      load();
    }
  };

  const openEdit = (item: AlumniDirectoryItem) => {
    setSelected(item);
    setEditForm({
      batch_year: item.batch_year || '',
      last_class: item.last_class || '',
      last_section: item.last_section || '',
      current_email: item.current_email || '',
      current_phone: item.current_phone || '',
      current_city: item.current_city || '',
      linkedin_url: item.linkedin_url || '',
      notes: item.notes || '',
      is_public: item.is_public,
    });
  };

  const saveProfile = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/alumni/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await response.json();
      if (data.success) {
        setSelected(null);
        load();
      } else {
        await alert(data.error || 'Failed to save', { type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const batchYears = Array.from(
    new Set(items.map((item) => item.batch_year).filter(Boolean) as string[])
  ).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Only students from the highest class
        {highestClass ? ` (${highestClass})` : ''} who completed exit with{' '}
        <span className="font-semibold">Passed Final Class</span> appear in alumni.
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, admission no., email, phone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <select
          value={batchYear}
          onChange={(e) => setBatchYear(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All batches</option>
          {batchYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => load()}
          className="border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
        >
          <FiRefreshCw size={14} />
          Refresh
        </button>
        <button
          type="button"
          onClick={handleSync}
          className="bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 text-sm"
        >
          Sync eligible alumni
        </button>
      </div>

      <p className="text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{total}</span> alumni in directory
      </p>

      {loading ? (
        <div className="py-12 text-center text-gray-500 text-sm">Loading alumni directory…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-sm border rounded-lg bg-gray-50">
          No eligible alumni yet. Exit a highest-class student with reason &quot;Passed Final Class&quot;, then sync.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Alumni</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Batch</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Last Class</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Exit</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Contact</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <FiUser className="text-gray-500" size={14} />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{item.full_name}</p>
                        <p className="text-xs text-gray-500">
                          <AdmissionNo value={item.admission_number} />
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">{item.batch_year || '—'}</td>
                  <td className="px-4 py-2">
                    {item.last_class || '—'}
                    {item.last_section ? ` · ${item.last_section}` : ''}
                  </td>
                  <td className="px-4 py-2">
                    <p>{item.exit_reason || item.student_status}</p>
                    {item.exit_date && (
                      <p className="text-xs text-gray-500">
                        {new Date(item.exit_date).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <p>{item.current_phone || '—'}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[160px]">
                      {item.current_email || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="text-primary-600 hover:text-primary-800 inline-flex items-center gap-1 text-xs"
                    >
                      <FiEdit2 size={13} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AppModal open={Boolean(selected)} onClose={() => setSelected(null)}>
        <div className={APP_MODAL_PANEL}>
        {selected && (
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selected.full_name}</h3>
                <p className="text-sm text-gray-500">Update alumni contact & profile</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <FiX size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['batch_year', 'Batch Year'],
                ['last_class', 'Last Class'],
                ['last_section', 'Last Section'],
                ['current_email', 'Email'],
                ['current_phone', 'Phone'],
                ['current_city', 'City'],
                ['linkedin_url', 'LinkedIn URL'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="text"
                    value={String(editForm[key as keyof AlumniDirectoryItem] || '')}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={editForm.is_public ?? true}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, is_public: e.target.checked }))}
                />
                Show in public alumni directory
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSelected(null)} className="px-4 py-2 text-sm border rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
        </div>
      </AppModal>
    </div>
  );
}
