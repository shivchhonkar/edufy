'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FiEye,
  FiFilter,
  FiMessageSquare,
  FiRefreshCw,
  FiSend,
} from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';

interface MessageLogRow {
  id: number;
  title: string;
  message: string;
  message_type: string | null;
  recipient_label: string | null;
  recipient_name: string | null;
  recipient_phone: string;
  sent_at: string | null;
  created_at: string;
  delivery_status: string | null;
  status: string;
  sms_type: string;
}

interface StaffMessagesTabProps {
  staffId: number;
  staffPhone?: string | null;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function typeBadgeClass(type: string | null) {
  const t = (type || '').toLowerCase();
  if (t.includes('manual')) return 'bg-blue-100 text-blue-800';
  if (t.includes('automated')) return 'bg-purple-100 text-purple-800';
  if (t.includes('scheduled')) return 'bg-cyan-100 text-cyan-800';
  return 'bg-gray-100 text-gray-800';
}

export default function StaffMessagesTab({ staffId, staffPhone }: StaffMessagesTabProps) {
  const { alert } = useDialog();
  const [history, setHistory] = useState<MessageLogRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [smsReady, setSmsReady] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [viewMessage, setViewMessage] = useState<MessageLogRow | null>(null);
  const [sending, setSending] = useState(false);
  const [compose, setCompose] = useState({
    title: '',
    message: '',
    sms_type: 'transactional' as 'transactional' | 'promotional',
  });

  const loadHistory = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
      type: typeFilter,
    });
    if (search.trim()) params.set('search', search.trim());

    const res = await fetch(`/api/staff/${staffId}/messages/history?${params}`);
    const data = await res.json();
    if (data.success) {
      setHistory(data.data);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    }
  }, [staffId, pagination.page, pagination.limit, typeFilter, search]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes] = await Promise.all([
        fetch('/api/communications/config'),
        loadHistory(),
      ]);
      const configData = await configRes.json();
      if (configData.success) setSmsReady(Boolean(configData.data.smsReady));
    } finally {
      setLoading(false);
    }
  }, [loadHistory]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!loading) loadHistory();
  }, [typeFilter, pagination.page]);

  const handleSend = async () => {
    if (!compose.title.trim() || !compose.message.trim()) {
      await alert('Title and message are required', { title: 'Validation', type: 'warning' });
      return;
    }
    if (!staffPhone?.trim()) {
      await alert('Add a phone number to the staff profile before sending SMS.', {
        title: 'No phone number',
        type: 'warning',
      });
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compose),
      });
      const data = await res.json();
      if (data.success) {
        setShowSendModal(false);
        setCompose({ title: '', message: '', sms_type: 'transactional' });
        await loadHistory();
        await alert(data.message || 'Message sent', { title: 'Sent', type: 'success' });
      } else {
        await alert(data.error || 'Failed to send message', { title: 'Error', type: 'error' });
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-500">Loading messages...</div>;
  }

  return (
    <div className="space-y-4">
      {!smsReady && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          SMS is not configured. Set OTP_API_KEY and SMS_SENDER_ID in .env.local to send messages.
          You can still view message history matched to the staff phone number.
        </div>
      )}

      {!staffPhone?.trim() && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No phone number on this staff profile. Add a phone number to send SMS and track messages.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <FiMessageSquare className="text-primary-600" />
            Messages
          </h3>
          <p className="mt-0.5 text-sm text-gray-500">SMS history and quick send</p>
        </div>
        <button
          type="button"
          disabled={!smsReady || !staffPhone?.trim()}
          onClick={() => setShowSendModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <FiSend size={15} />
          Send Message
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1">
            <FiFilter className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <select
              value={typeFilter}
              onChange={(e) => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                setTypeFilter(e.target.value);
              }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
            >
              <option value="all">All types</option>
              <option value="manual">Manual</option>
              <option value="automated">Automated</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Search title or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setPagination((prev) => ({ ...prev, page: 1 }));
              loadHistory();
            }}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            <FiRefreshCw size={14} />
            Refresh
          </button>
        </div>

        {history.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">No messages found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Title</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600">
                      {formatDateTime(row.sent_at || row.created_at)}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900">{row.title}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(row.message_type)}`}
                      >
                        {row.message_type || row.sms_type || 'SMS'}
                      </span>
                    </td>
                    <td className="px-3 py-2 capitalize text-gray-600">
                      {row.delivery_status || row.status}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setViewMessage(row)}
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800"
                      >
                        <FiEye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="rounded border px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="rounded border px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showSendModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="border-b px-4 py-3">
              <h4 className="font-semibold text-gray-900">Send Message</h4>
            </div>
            <div className="space-y-3 p-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Title</span>
                <input
                  type="text"
                  value={compose.title}
                  onChange={(e) => setCompose((c) => ({ ...c, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Message</span>
                <textarea
                  rows={4}
                  value={compose.message}
                  onChange={(e) => setCompose((c) => ({ ...c, message: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">SMS Type</span>
                <select
                  value={compose.sms_type}
                  onChange={(e) =>
                    setCompose((c) => ({
                      ...c,
                      sms_type: e.target.value as 'transactional' | 'promotional',
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="transactional">Transactional</option>
                  <option value="promotional">Promotional</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={handleSend}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMessage && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="border-b px-4 py-3">
              <h4 className="font-semibold text-gray-900">{viewMessage.title}</h4>
              <p className="text-xs text-gray-500">
                {formatDateTime(viewMessage.sent_at || viewMessage.created_at)}
              </p>
            </div>
            <div className="space-y-2 p-4 text-sm">
              <p className="whitespace-pre-wrap text-gray-800">{viewMessage.message}</p>
              <p className="text-gray-500">
                To: {viewMessage.recipient_name || 'Staff'} ({viewMessage.recipient_phone})
              </p>
            </div>
            <div className="flex justify-end border-t px-4 py-3">
              <button
                type="button"
                onClick={() => setViewMessage(null)}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
