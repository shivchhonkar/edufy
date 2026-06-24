'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FiCalendar,
  FiEye,
  FiFilter,
  FiMessageSquare,
  FiRefreshCw,
  FiSend,
  FiUser,
} from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';
import { SMS_TEMPLATES } from '@/lib/sms-recipients';

interface StudentMessagingSettings {
  automation_enabled: boolean;
  exclude_fee_reminders: boolean;
  exclude_attendance_alerts: boolean;
  exclude_homework_reminders: boolean;
  exclude_exam_results: boolean;
  exclude_promotional: boolean;
}

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

interface MessagesTabProps {
  studentId: number;
}

const EXCLUSION_OPTIONS: {
  key: keyof Pick<
    StudentMessagingSettings,
    | 'exclude_fee_reminders'
    | 'exclude_attendance_alerts'
    | 'exclude_homework_reminders'
    | 'exclude_exam_results'
    | 'exclude_promotional'
  >;
  label: string;
}[] = [
  { key: 'exclude_fee_reminders', label: 'Fee Reminders' },
  { key: 'exclude_attendance_alerts', label: 'Attendance Alerts' },
  { key: 'exclude_homework_reminders', label: 'Homework Reminders' },
  { key: 'exclude_exam_results', label: 'Exam & Result Notifications' },
  { key: 'exclude_promotional', label: 'Promotional Messages' },
];

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
  if (t.includes('fee')) return 'bg-amber-100 text-amber-800';
  if (t.includes('attendance')) return 'bg-blue-100 text-blue-800';
  if (t.includes('homework')) return 'bg-purple-100 text-purple-800';
  if (t.includes('exam')) return 'bg-indigo-100 text-indigo-800';
  if (t.includes('promotion') || t.includes('promo')) return 'bg-pink-100 text-pink-800';
  if (t.includes('scheduled')) return 'bg-cyan-100 text-cyan-800';
  return 'bg-gray-100 text-gray-800';
}

export default function MessagesTab({ studentId }: MessagesTabProps) {
  const { alert } = useDialog();
  const [settings, setSettings] = useState<StudentMessagingSettings | null>(null);
  const [history, setHistory] = useState<MessageLogRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [smsReady, setSmsReady] = useState(false);

  const [showSendModal, setShowSendModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [viewMessage, setViewMessage] = useState<MessageLogRow | null>(null);
  const [sending, setSending] = useState(false);

  const [compose, setCompose] = useState({
    title: '',
    message: '',
    sms_type: 'transactional' as 'transactional' | 'promotional',
    recipient_target: 'all',
    scheduled_at: '',
  });

  const loadSettings = useCallback(async () => {
    const res = await fetch(`/api/students/${studentId}/messages/settings`);
    const data = await res.json();
    if (data.success) setSettings(data.data);
  }, [studentId]);

  const loadHistory = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
      type: typeFilter,
    });
    if (search.trim()) params.set('search', search.trim());

    const res = await fetch(`/api/students/${studentId}/messages/history?${params}`);
    const data = await res.json();
    if (data.success) {
      setHistory(data.data);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    }
  }, [studentId, pagination.page, pagination.limit, typeFilter, search]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes] = await Promise.all([
        fetch('/api/communications/config'),
        loadSettings(),
        loadHistory(),
      ]);
      const configData = await configRes.json();
      if (configData.success) setSmsReady(Boolean(configData.data.smsReady));
    } finally {
      setLoading(false);
    }
  }, [loadSettings, loadHistory]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!loading) loadHistory();
  }, [typeFilter, pagination.page]);

  const saveSettings = async (patch: Partial<StudentMessagingSettings>) => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const merged = { ...settings, ...patch };
      const res = await fetch(`/api/students/${studentId}/messages/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      } else {
        await alert(data.error || 'Failed to save settings', { title: 'Error', type: 'error' });
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSend = async () => {
    if (!compose.title.trim() || !compose.message.trim()) {
      await alert('Title and message are required', { title: 'Validation', type: 'warning' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/students/${studentId}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: compose.title,
          message: compose.message,
          sms_type: compose.sms_type,
          recipient_target: compose.recipient_target,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSendModal(false);
        setCompose((c) => ({ ...c, title: '', message: '' }));
        await loadHistory();
        await alert(data.message || 'Message sent', { title: 'Sent', type: 'success' });
      } else {
        await alert(data.error || 'Failed to send message', { title: 'Error', type: 'error' });
      }
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!compose.title.trim() || !compose.message.trim() || !compose.scheduled_at) {
      await alert('Title, message, and schedule time are required', {
        title: 'Validation',
        type: 'warning',
      });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/students/${studentId}/messages/scheduled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: compose.title,
          message: compose.message,
          sms_type: compose.sms_type,
          recipient_target: compose.recipient_target,
          scheduled_at: compose.scheduled_at,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowScheduleModal(false);
        setCompose((c) => ({ ...c, title: '', message: '', scheduled_at: '' }));
        await alert(data.message || 'Message scheduled', { title: 'Scheduled', type: 'success' });
      } else {
        await alert(data.error || 'Failed to schedule message', { title: 'Error', type: 'error' });
      }
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (key: string) => {
    const template = SMS_TEMPLATES[key];
    if (!template) return;
    setCompose((c) => ({
      ...c,
      title: template.label,
      message: template.message,
      sms_type: template.sms_type,
    }));
    setShowTemplatesModal(false);
  };

  if (loading || !settings) {
    return <div className="text-center py-12 text-gray-500 text-sm">Loading messages...</div>;
  }

  return (
    <div className="space-y-4">
      {!smsReady && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          SMS is not configured. Set <code className="text-xs">OTP_API_KEY</code> and{' '}
          <code className="text-xs">SMS_SENDER_ID</code> in .env.local to send via 2factor.in.
          You can still manage automation preferences and view history.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4">
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Message Settings</h4>
              <p className="text-xs text-gray-500 mt-0.5">Automation status</p>
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700">
                {settings.automation_enabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                type="button"
                disabled={savingSettings}
                onClick={() => saveSettings({ automation_enabled: !settings.automation_enabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  settings.automation_enabled ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                    settings.automation_enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
            {settings.automation_enabled && (
              <span className="inline-flex text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                Enabled
              </span>
            )}
            <p className="text-xs text-gray-500">
              Student will receive automated messages as per school rules.
            </p>

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium text-gray-700">Do not send automated messages for:</p>
              {EXCLUSION_OPTIONS.map((option) => (
                <label key={option.key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={settings[option.key]}
                    disabled={savingSettings}
                    onChange={(e) => saveSettings({ [option.key]: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  {option.label}
                </label>
              ))}
            </div>

            <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800">
              Manual messages can still be sent even if automation is disabled.
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Quick Actions</h4>
            <button
              type="button"
              disabled={!smsReady}
              onClick={() => setShowSendModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <FiSend size={14} />
              Send Message
            </button>
            <button
              type="button"
              disabled={!smsReady}
              onClick={() => setShowScheduleModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <FiCalendar size={14} />
              Schedule Message
            </button>
            <button
              type="button"
              onClick={() => setShowTemplatesModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <FiUser size={14} />
              Message Templates
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Message History</h4>
              <p className="text-xs text-gray-500">All messages sent to student and parents</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <FiFilter className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value="all">All Messages</option>
                  <option value="automated">Automated</option>
                  <option value="manual">Manual</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
              <input
                type="search"
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPagination((p) => ({ ...p, page: 1 }));
                    loadHistory();
                  }
                }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm min-w-[140px]"
              />
              <button
                type="button"
                onClick={() => {
                  setPagination((p) => ({ ...p, page: 1 }));
                  loadHistory();
                }}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                aria-label="Refresh"
              >
                <FiRefreshCw size={14} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Message</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Recipient</th>
                  <th className="px-4 py-3 text-left">Sent On</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      No messages found for this student.
                    </td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="font-medium text-gray-900 truncate">{row.title}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{row.message}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${typeBadgeClass(row.message_type)}`}
                        >
                          {row.message_type || 'SMS'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <p>{row.recipient_label || row.recipient_name || 'Parent'}</p>
                        <p className="text-xs text-gray-500">{row.recipient_phone}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDateTime(row.sent_at || row.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            row.status === 'sent'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {row.delivery_status === 'delivered' ? 'Delivered' : row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setViewMessage(row)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 rounded"
                          aria-label="View message"
                        >
                          <FiEye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + (history.length ? 1 : 0)} to{' '}
              {(pagination.page - 1) * pagination.limit + history.length} of {pagination.total}{' '}
              messages
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="px-2 py-1 border border-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2">{pagination.page}</span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="px-2 py-1 border border-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {(showSendModal || showScheduleModal) && (
        <ComposeModal
          title={showScheduleModal ? 'Schedule Message' : 'Send Message'}
          compose={compose}
          setCompose={setCompose}
          onClose={() => {
            setShowSendModal(false);
            setShowScheduleModal(false);
          }}
          onSubmit={showScheduleModal ? handleSchedule : handleSend}
          sending={sending}
          showScheduleField={showScheduleModal}
        />
      )}

      {showTemplatesModal && (
        <ModalShell title="Message Templates" onClose={() => setShowTemplatesModal(false)}>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {Object.entries(SMS_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className="w-full text-left rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
              >
                <p className="font-medium text-sm text-gray-900">{template.label}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.message}</p>
              </button>
            ))}
          </div>
        </ModalShell>
      )}

      {viewMessage && (
        <ModalShell title={viewMessage.title} onClose={() => setViewMessage(null)}>
          <div className="space-y-3 text-sm">
            <p className="text-gray-700 whitespace-pre-wrap">{viewMessage.message}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <p>To: {viewMessage.recipient_label || viewMessage.recipient_name}</p>
              <p>Phone: {viewMessage.recipient_phone}</p>
              <p>Sent: {formatDateTime(viewMessage.sent_at || viewMessage.created_at)}</p>
              <p>Type: {viewMessage.message_type || 'SMS'}</p>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ComposeModal({
  title,
  compose,
  setCompose,
  onClose,
  onSubmit,
  sending,
  showScheduleField,
}: {
  title: string;
  compose: {
    title: string;
    message: string;
    sms_type: 'transactional' | 'promotional';
    recipient_target: string;
    scheduled_at: string;
  };
  setCompose: React.Dispatch<React.SetStateAction<typeof compose>>;
  onClose: () => void;
  onSubmit: () => void;
  sending: boolean;
  showScheduleField: boolean;
}) {
  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Title</span>
          <input
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={compose.title}
            onChange={(e) => setCompose((c) => ({ ...c, title: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Message</span>
          <textarea
            rows={4}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={compose.message}
            onChange={(e) => setCompose((c) => ({ ...c, message: e.target.value }))}
          />
          <span className="text-xs text-gray-500">
            Use {'{{student_name}}'} and {'{{parent_name}}'} for personalization.
          </span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Recipient</span>
            <select
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              value={compose.recipient_target}
              onChange={(e) => setCompose((c) => ({ ...c, recipient_target: e.target.value }))}
            >
              <option value="all">Both Parents</option>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="primary">Primary Contact</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">SMS Type</span>
            <select
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              value={compose.sms_type}
              onChange={(e) =>
                setCompose((c) => ({
                  ...c,
                  sms_type: e.target.value as 'transactional' | 'promotional',
                }))
              }
            >
              <option value="transactional">Transactional</option>
              <option value="promotional">Promotional</option>
            </select>
          </label>
        </div>
        {showScheduleField && (
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Schedule date & time</span>
            <input
              type="datetime-local"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={compose.scheduled_at}
              onChange={(e) => setCompose((c) => ({ ...c, scheduled_at: e.target.value }))}
            />
          </label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={onSubmit}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <FiMessageSquare size={14} />
            {sending ? 'Sending...' : showScheduleField ? 'Schedule' : 'Send via 2factor'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
