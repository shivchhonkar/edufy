'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import AlumniSelectField from '@/features/alumni/components/AlumniSelectField';
import type { AlumniSuccessStory } from '@/lib/alumni-utils';
import { useDialog } from '@/shared/context/DialogContext';
import { FiEdit2, FiPlus, FiSearch, FiStar, FiTrash2, FiX } from 'react-icons/fi';

const emptyForm = {
  student_id: '',
  title: '',
  story: '',
  achievement_summary: '',
  photo_url: '',
  is_published: false,
};

export default function AlumniSuccessStoriesTab() {
  const { alert, confirm } = useDialog();
  const [items, setItems] = useState<AlumniSuccessStory[]>([]);
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
      const response = await fetch(`/api/alumni/success-stories?${params}`);
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

  const openEdit = (item: AlumniSuccessStory) => {
    setEditId(item.id);
    setForm({
      student_id: String(item.student_id),
      title: item.title,
      story: item.story,
      achievement_summary: item.achievement_summary || '',
      photo_url: item.photo_url || '',
      is_published: item.is_published,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.student_id || !form.title.trim() || !form.story.trim()) {
      await alert('Alumni, title, and story are required', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(
        editId ? `/api/alumni/success-stories/${editId}` : '/api/alumni/success-stories',
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
    const ok = await confirm('Delete this success story?', { type: 'warning' });
    if (!ok) return;
    await fetch(`/api/alumni/success-stories/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stories..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <button type="button" onClick={openCreate} className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <FiPlus size={14} /> Add Story
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-sm border rounded-lg bg-gray-50">No success stories yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {item.photo_url ? (
                  <img src={item.photo_url} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <FiStar className="text-amber-500" size={22} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${item.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {item.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-sm text-primary-700 mt-0.5">{item.alumni_name}</p>
                  {item.batch_year && <p className="text-xs text-gray-500">Batch {item.batch_year}</p>}
                  {item.achievement_summary && <p className="text-sm text-gray-600 mt-2 font-medium">{item.achievement_summary}</p>}
                  <p className="text-sm text-gray-600 mt-2 line-clamp-3">{item.story}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => openEdit(item)} className="text-xs text-primary-600 inline-flex items-center gap-1"><FiEdit2 size={12} /> Edit</button>
                <button type="button" onClick={() => remove(item.id)} className="text-xs text-red-600 inline-flex items-center gap-1"><FiTrash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AppModal open={showModal} onClose={() => setShowModal(false)}>
        <div className={APP_MODAL_PANEL}>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{editId ? 'Edit' : 'Add'} Success Story</h3>
            <button type="button" onClick={() => setShowModal(false)}><FiX /></button>
          </div>
          <div className="space-y-3">
            {!editId && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Alumni</label>
                <AlumniSelectField value={form.student_id} onChange={(v) => setForm((p) => ({ ...p, student_id: v }))} required />
              </div>
            )}
            <input placeholder="Story title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Achievement summary (short)" value={form.achievement_summary} onChange={(e) => setForm((p) => ({ ...p, achievement_summary: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Photo URL (optional)" value={form.photo_url} onChange={(e) => setForm((p) => ({ ...p, photo_url: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <textarea placeholder="Full story" value={form.story} onChange={(e) => setForm((p) => ({ ...p, story: e.target.value }))} rows={6} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))} />
              Publish on alumni portal
            </label>
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
