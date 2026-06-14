'use client';

import { useCallback, useEffect, useState } from 'react';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import {
  AUDIENCE_OPTIONS,
  NOTIFICATION_PRIORITY_OPTIONS,
  formatAudienceLabel,
  formatDateTime,
} from '@/features/communications/constants';
import {
  FiArchive,
  FiBell,
  FiEdit2,
  FiEye,
  FiPlus,
  FiSearch,
  FiSend,
  FiTrash2,
  FiX,
} from 'react-icons/fi';

interface ClassOption {
  id: number;
  name: string;
}

interface SectionOption {
  id: number;
  class_id: number;
  name: string;
}

export interface SchoolNotification {
  id: number;
  title: string;
  message: string;
  audience_type: string;
  class_id?: number | null;
  section_id?: number | null;
  class_name?: string | null;
  section_name?: string | null;
  priority: string;
  category: string;
  status: string;
  send_sms: boolean;
  scheduled_at?: string | null;
  expires_at?: string | null;
  published_at?: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  expired: 'bg-amber-100 text-amber-800',
  archived: 'bg-slate-100 text-slate-600',
};

const PRIORITY_STYLES: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-800',
  urgent: 'bg-red-100 text-red-800',
};

const emptyForm = {
  title: '',
  message: '',
  audience_type: 'all_parents',
  class_id: '',
  section_id: '',
  priority: 'info',
  category: 'general',
  scheduled_at: '',
  expires_at: '',
  send_sms: false,
};

interface NotificationsTabProps {
  classes: ClassOption[];
}

export default function NotificationsTab({ classes }: NotificationsTabProps) {
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState<SchoolNotification | null>(null);
  const [editing, setEditing] = useState<SchoolNotification | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SchoolNotification | null>(null);
  const [publishTarget, setPublishTarget] = useState<SchoolNotification | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/communications/notifications';
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      if (params.toString()) url += `?${params}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setNotifications(data.data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (form.class_id) {
      fetch(`/api/sections?class_id=${form.class_id}`)
        .then((r) => r.json())
        .then((d) => d.success && setSections(d.data));
    } else {
      setSections([]);
      setForm((f) => ({ ...f, section_id: '' }));
    }
  }, [form.class_id]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  };

  const openEdit = (notification: SchoolNotification) => {
    setEditing(notification);
    setForm({
      title: notification.title,
      message: notification.message,
      audience_type: notification.audience_type,
      class_id: notification.class_id ? String(notification.class_id) : '',
      section_id: notification.section_id ? String(notification.section_id) : '',
      priority: notification.priority,
      category: notification.category,
      scheduled_at: notification.scheduled_at?.slice(0, 16) || '',
      expires_at: notification.expires_at?.split('T')[0] || '',
      send_sms: notification.send_sms,
    });
    setShowForm(true);
    setError('');
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        message: form.message,
        audience_type: form.audience_type,
        class_id: form.class_id ? parseInt(form.class_id, 10) : null,
        section_id: form.section_id ? parseInt(form.section_id, 10) : null,
        priority: form.priority,
        category: form.category,
        scheduled_at: form.scheduled_at || null,
        expires_at: form.expires_at || null,
        send_sms: form.send_sms,
      };

      const url = editing
        ? `/api/communications/notifications/${editing.id}`
        : '/api/communications/notifications';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setSuccess(editing ? 'Notification updated' : 'Notification created as draft');
        fetchNotifications();
      } else {
        setError(data.error || 'Failed to save notification');
      }
    } catch {
      setError('Failed to save notification');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(
        `/api/communications/notifications/${publishTarget.id}/publish`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (data.success) {
        let msg = data.message || 'Notification published';
        if (data.sms?.skipped && publishTarget.send_sms) {
          msg = 'Notification published. SMS was not sent — configure OTP_API_KEY first.';
        } else if (publishTarget.send_sms && data.sms?.sent) {
          msg = `Notification published. SMS sent to ${data.sms.sent} recipient(s).`;
        }
        setSuccess(msg);
        setPublishTarget(null);
        fetchNotifications();
      } else {
        setError(data.error || 'Failed to publish');
      }
    } catch {
      setError('Failed to publish notification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/communications/notifications/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Notification deleted');
        setDeleteTarget(null);
        fetchNotifications();
      } else {
        setError(data.error || 'Failed to delete');
      }
    } catch {
      setError('Failed to delete notification');
    }
  };

  const handleArchive = async (notification: SchoolNotification) => {
    const res = await fetch(`/api/communications/notifications/${notification.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    });
    const data = await res.json();
    if (data.success) {
      setSuccess('Notification archived');
      fetchNotifications();
    }
  };

  const needsClass =
    form.audience_type === 'class_parents' || form.audience_type === 'section_parents';

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-56"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700"
        >
          <FiPlus />
          New Notification
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            <FiBell className="mx-auto w-10 h-10 text-gray-300 mb-2" />
            No notifications yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Audience</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notifications.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{n.title}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">
                    {formatAudienceLabel(n.audience_type, n.class_name, n.section_name)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_STYLES[n.priority] || ''}`}
                    >
                      {n.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[n.status] || ''}`}
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(n.published_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setShowView(n)}
                        className="p-2 text-gray-500 hover:text-primary-600"
                        title="View"
                      >
                        <FiEye size={16} />
                      </button>
                      {n.status === 'draft' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(n)}
                            className="p-2 text-gray-500 hover:text-primary-600"
                            title="Edit"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPublishTarget(n)}
                            className="p-2 text-gray-500 hover:text-green-600"
                            title="Publish"
                          >
                            <FiSend size={16} />
                          </button>
                        </>
                      )}
                      {n.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleArchive(n)}
                          className="p-2 text-gray-500 hover:text-amber-600"
                          title="Archive"
                        >
                          <FiArchive size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(n)}
                        className="p-2 text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">
                {editing ? 'Edit Notification' : 'New Notification'}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-500">
                <FiX size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                  <select
                    value={form.audience_type}
                    onChange={(e) => setForm({ ...form, audience_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {AUDIENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {NOTIFICATION_PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {needsClass && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                    <select
                      value={form.class_id}
                      onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Select class</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.audience_type === 'section_parents' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Section
                      </label>
                      <select
                        value={form.section_id}
                        onChange={(e) => setForm({ ...form, section_id: e.target.value })}
                        disabled={!form.class_id}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                      >
                        <option value="">Select section</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule for (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires on</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.send_sms}
                  onChange={(e) => setForm({ ...form, send_sms: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Also send SMS when published
              </label>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Update draft' : 'Save as draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">{showView.title}</h2>
              <button type="button" onClick={() => setShowView(null)} className="text-gray-500">
                <FiX size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[showView.status]}`}
                >
                  {showView.status}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_STYLES[showView.priority]}`}
                >
                  {showView.priority}
                </span>
              </div>
              <p className="text-gray-800">{showView.message}</p>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!publishTarget}
        title="Publish Notification"
        message={`Activate "${publishTarget?.title}" for the selected audience?${publishTarget?.send_sms ? ' An SMS will also be sent.' : ''}`}
        confirmText="Publish"
        cancelText="Cancel"
        type="warning"
        onConfirm={handlePublish}
        onCancel={() => setPublishTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Notification"
        message={`Delete "${deleteTarget?.title}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
