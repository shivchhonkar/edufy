'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import {
  ALUMNI_EVENT_STATUS_OPTIONS,
  ALUMNI_EVENT_TYPES,
  eventTypeLabel,
  type AlumniEvent,
} from '@/lib/alumni-utils';
import { useDialog } from '@/shared/context/DialogContext';
import { FiCalendar, FiEdit2, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi';

const emptyForm = {
  title: '',
  description: '',
  event_date: '',
  event_time: '',
  venue: '',
  event_type: 'reunion',
  max_attendees: '',
  registration_deadline: '',
  status: 'scheduled',
};

export default function AlumniEventsTab() {
  const { alert, confirm } = useDialog();
  const [items, setItems] = useState<AlumniEvent[]>([]);
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
      const response = await fetch(`/api/alumni/events?${params}`);
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

  const openEdit = (item: AlumniEvent) => {
    setEditId(item.id);
    setForm({
      title: item.title,
      description: item.description || '',
      event_date: String(item.event_date).slice(0, 10),
      event_time: item.event_time ? String(item.event_time).slice(0, 5) : '',
      venue: item.venue || '',
      event_type: item.event_type,
      max_attendees: item.max_attendees ? String(item.max_attendees) : '',
      registration_deadline: item.registration_deadline ? String(item.registration_deadline).slice(0, 10) : '',
      status: item.status,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.event_date) {
      await alert('Title and event date are required', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        max_attendees: form.max_attendees ? parseInt(form.max_attendees, 10) : null,
      };
      const response = await fetch(
        editId ? `/api/alumni/events/${editId}` : '/api/alumni/events',
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
    const ok = await confirm('Delete this event?', { type: 'warning' });
    if (!ok) return;
    await fetch(`/api/alumni/events/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <button type="button" onClick={openCreate} className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <FiPlus size={14} /> Create Event
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-sm border rounded-lg bg-gray-50">No alumni events scheduled.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-primary-700 mt-0.5">{eventTypeLabel(item.event_type)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'scheduled' ? 'bg-green-100 text-green-800' : item.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                  {item.status}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p className="flex items-center gap-1.5"><FiCalendar size={13} /> {new Date(item.event_date).toLocaleDateString('en-IN')}{item.event_time ? ` · ${String(item.event_time).slice(0, 5)}` : ''}</p>
                {item.venue && <p>{item.venue}</p>}
                <p className="text-xs text-gray-500">{item.registration_count ?? 0} registered{item.max_attendees ? ` / ${item.max_attendees} max` : ''}</p>
              </div>
              {item.description && <p className="mt-2 text-xs text-gray-500 line-clamp-2">{item.description}</p>}
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
            <h3 className="text-lg font-medium">{editId ? 'Edit' : 'Create'} Alumni Event</h3>
            <button type="button" onClick={() => setShowModal(false)}><FiX /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Event title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="sm:col-span-2 px-3 py-2 border rounded-lg text-sm" />
            <select value={form.event_type} onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm">
              {ALUMNI_EVENT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm">
              {ALUMNI_EVENT_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input type="date" value={form.event_date} onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <input type="time" value={form.event_time} onChange={(e) => setForm((p) => ({ ...p, event_time: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Venue" value={form.venue} onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))} className="sm:col-span-2 px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Max attendees" value={form.max_attendees} onChange={(e) => setForm((p) => ({ ...p, max_attendees: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <input type="date" value={form.registration_deadline} onChange={(e) => setForm((p) => ({ ...p, registration_deadline: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="sm:col-span-2 w-full px-3 py-2 border rounded-lg text-sm" />
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
