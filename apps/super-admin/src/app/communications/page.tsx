'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import CircularsTab from '@/features/communications/components/CircularsTab';
import NotificationsTab from '@/features/communications/components/NotificationsTab';
import EmailCampaignsTab from '@/features/communications/components/EmailCampaignsTab';
import { AUDIENCE_OPTIONS } from '@/features/communications/constants';
import {
  FiMessageSquare,
  FiSend,
  FiUsers,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckSquare,
  FiSquare,
} from 'react-icons/fi';

interface Class {
  id: number;
  name: string;
}

interface Section {
  id: number;
  class_id: number;
  name: string;
}

interface Recipient {
  phone: string;
  name: string;
  student_id?: number;
  student_name?: string;
  source?: string;
}

interface Template {
  key: string;
  label: string;
  message: string;
  sms_type: string;
}

interface Campaign {
  id: number;
  title: string;
  message: string;
  sms_type: string;
  audience_type: string;
  class_name?: string;
  section_name?: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
}

type TabId =
  | 'sms'
  | 'whatsapp'
  | 'circulars'
  | 'notifications'
  | 'email'
  | 'history';

const TAB_ITEMS: { id: TabId; label: string }[] = [
  { id: 'sms', label: 'SMS' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'circulars', label: 'Circulars' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'email', label: 'Email Campaigns' },
  { id: 'history', label: 'History' },
];

const TAB_DESCRIPTIONS: Record<TabId, string> = {
  sms: 'Send SMS to parents and staff.',
  whatsapp: 'WhatsApp Business messaging.',
  circulars: 'Publish official school circulars to parents and staff.',
  notifications: 'Create and publish in-app alerts and announcements.',
  email: 'Send email campaigns to parents and staff.',
  history: 'View past SMS campaign history.',
};

function recipientKey(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10) || phone;
}

function CommunicationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('sms');
  const [config, setConfig] = useState<{
    smsReady: boolean;
    otpApiKeySet: boolean;
    senderIdSet: boolean;
    senderId: string | null;
    templates: Template[];
  } | null>(null);

  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [audienceType, setAudienceType] = useState('all_parents');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [smsType, setSmsType] = useState<'transactional' | 'promotional'>('transactional');
  const [templateKey, setTemplateKey] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchConfig = useCallback(async () => {
    const res = await fetch('/api/communications/config');
    const data = await res.json();
    if (data.success) setConfig(data.data);
  }, []);

  const fetchClasses = useCallback(async () => {
    const res = await fetch('/api/classes');
    const data = await res.json();
    if (data.success) setClasses(data.data);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    const res = await fetch('/api/communications/campaigns');
    const data = await res.json();
    if (data.success) setCampaigns(data.data);
  }, []);

  const fetchRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    setError('');
    try {
      let url = `/api/communications/recipients?audience_type=${audienceType}`;
      if (classId) url += `&class_id=${classId}`;
      if (sectionId) url += `&section_id=${sectionId}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const list: Recipient[] = data.data;
        setRecipients(list);
        setSelectedKeys(new Set(list.map((r) => recipientKey(r.phone))));
      } else {
        setRecipients([]);
        setSelectedKeys(new Set());
        setError(data.error || 'Failed to load recipients');
      }
    } catch {
      setError('Failed to load recipients');
      setRecipients([]);
      setSelectedKeys(new Set());
    } finally {
      setLoadingRecipients(false);
    }
  }, [audienceType, classId, sectionId]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const validTabs: TabId[] = [
      'sms',
      'whatsapp',
      'circulars',
      'notifications',
      'email',
      'history',
    ];
    if (tab && validTabs.includes(tab as TabId)) {
      setActiveTab(tab as TabId);
    }
  }, [searchParams]);

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/communications?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    fetchConfig();
    fetchClasses();
    fetchCampaigns();
  }, [fetchConfig, fetchClasses, fetchCampaigns]);

  useEffect(() => {
    if (audienceType === 'class_parents' || audienceType === 'section_parents') {
      if (!classId) {
        setRecipients([]);
        setSelectedKeys(new Set());
        return;
      }
    }
    fetchRecipients();
  }, [fetchRecipients, audienceType, classId, sectionId]);

  useEffect(() => {
    if (!templateKey || !config?.templates) return;
    const tpl = config.templates.find((t) => t.key === templateKey);
    if (tpl) {
      setMessage(tpl.message);
      setSmsType(tpl.sms_type as 'transactional' | 'promotional');
      if (!title) setTitle(tpl.label);
    }
  }, [templateKey, config, title]);

  useEffect(() => {
    if (classId) {
      fetch(`/api/sections?class_id=${classId}`)
        .then((r) => r.json())
        .then((d) => d.success && setSections(d.data));
    } else {
      setSections([]);
      setSectionId('');
    }
  }, [classId]);

  const selectedRecipients = useMemo(
    () => recipients.filter((r) => selectedKeys.has(recipientKey(r.phone))),
    [recipients, selectedKeys]
  );

  const allSelected =
    recipients.length > 0 && selectedKeys.size === recipients.length;

  const toggleRecipient = (phone: string) => {
    const key = recipientKey(phone);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllRecipients = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(recipients.map((r) => recipientKey(r.phone))));
    }
  };

  const handleSend = async () => {
    setShowConfirm(false);
    setSending(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'School SMS',
          message,
          sms_type: smsType,
          audience_type: audienceType,
          class_id: classId ? parseInt(classId, 10) : null,
          section_id: sectionId ? parseInt(sectionId, 10) : null,
          template_key: templateKey || undefined,
          personalize: true,
          selected_recipients: selectedRecipients,
        }),
      });

      const data = await res.json();
      if (data.success || data.data?.sent > 0) {
        setSuccess(data.message || `Sent to ${data.data.sent} recipients`);
        fetchCampaigns();
      } else {
        setError(data.error || 'SMS send failed');
      }
    } catch {
      setError('SMS send failed');
    } finally {
      setSending(false);
    }
  };

  const needsClass =
    audienceType === 'class_parents' || audienceType === 'section_parents';
  const canSend =
    config?.smsReady &&
    message.trim() &&
    selectedRecipients.length > 0 &&
    !sending;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl text-gray-900">Communications</h1>
          <p className="text-gray-600 mt-1">{TAB_DESCRIPTIONS[activeTab]}</p>
        </div>

        {config && !config.smsReady && (
          <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-sm">
            <FiAlertCircle className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">SMS not fully configured</p>
              <p className="mt-1">
                Add to <code className="bg-amber-100 px-1 rounded">apps/super-admin/.env.local</code>:
              </p>
              <ul className="list-disc ml-5 mt-1">
                <li>
                  <code>OTP_API_KEY</code> — {config.otpApiKeySet ? 'set' : 'missing'}
                </li>
                <li>
                  <code>SMS_SENDER_ID</code> —{' '}
                  {config.senderIdSet ? config.senderId : 'missing (6-char DLT sender ID)'}
                </li>
              </ul>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Tabs + audience toolbar */}
        <div className="border-b mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <nav className="flex gap-1 min-w-max overflow-x-auto">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'sms' && (
            <div className="flex flex-wrap items-center gap-2 pb-2 sm:pb-3 sm:justify-end">
              <select
                value={audienceType}
                onChange={(e) => setAudienceType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[160px]"
              >
                {AUDIENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {needsClass && (
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[130px]"
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {audienceType === 'section_parents' && (
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  disabled={!classId}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[120px] disabled:bg-gray-50"
                >
                  <option value="">Section</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                disabled={!canSend}
                onClick={() => setShowConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 whitespace-nowrap"
              >
                <FiSend />
                {sending
                  ? 'Sending...'
                  : `Send (${selectedRecipients.length})`}
              </button>
            </div>
          )}
        </div>

        {activeTab === 'sms' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Compose SMS</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                  <select
                    value={templateKey}
                    onChange={(e) => setTemplateKey(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Custom message</option>
                    {config?.templates.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Fee Reminder - March"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMS type</label>
                  <select
                    value={smsType}
                    onChange={(e) =>
                      setSmsType(e.target.value as 'transactional' | 'promotional')
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="transactional">Transactional (TSMS)</option>
                    <option value="promotional">Promotional (PSMS)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    maxLength={500}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Use {{student_name}} and {{parent_name}} for personalization"
                  />
                  <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FiUsers className="text-primary-600 flex-shrink-0" />
                  <h2 className="font-semibold text-gray-900 truncate">
                    Recipients ({selectedRecipients.length}/{recipients.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={fetchRecipients}
                  disabled={loadingRecipients}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 flex-shrink-0"
                >
                  <FiRefreshCw className={loadingRecipients ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                {loadingRecipients ? (
                  <div className="text-center py-12 text-gray-500 text-sm">Loading...</div>
                ) : recipients.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    No recipients for this audience.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left w-10">
                          <button
                            type="button"
                            onClick={toggleAllRecipients}
                            className="text-gray-600 hover:text-primary-600"
                            title={allSelected ? 'Deselect all' : 'Select all'}
                          >
                            {allSelected ? (
                              <FiCheckSquare size={18} className="text-primary-600" />
                            ) : (
                              <FiSquare size={18} />
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Phone</th>
                        <th className="px-4 py-2 text-left">Student</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recipients.map((r, i) => {
                        const key = recipientKey(r.phone);
                        const checked = selectedKeys.has(key);
                        return (
                          <tr
                            key={`${key}-${i}`}
                            className={`hover:bg-gray-50 ${checked ? '' : 'opacity-60'}`}
                          >
                            <td className="px-4 py-2">
                              <button
                                type="button"
                                onClick={() => toggleRecipient(r.phone)}
                                className="text-gray-600 hover:text-primary-600"
                              >
                                {checked ? (
                                  <FiCheckSquare size={18} className="text-primary-600" />
                                ) : (
                                  <FiSquare size={18} />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-2">{r.name}</td>
                            <td className="px-4 py-2 text-gray-600">{r.phone}</td>
                            <td className="px-4 py-2 text-gray-600">{r.student_name || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="bg-white border border-dashed rounded-xl p-12 text-center">
            <FiMessageSquare className="mx-auto w-12 h-12 text-gray-300 mb-3" />
            <h2 className="text-lg font-semibold text-gray-900">WhatsApp — Coming Soon</h2>
            <p className="text-gray-600 mt-2 max-w-md mx-auto text-sm">
              WhatsApp Business API integration will be added in a future release.
              SMS is available now.
            </p>
          </div>
        )}

        {activeTab === 'circulars' && <CircularsTab classes={classes} />}

        {activeTab === 'notifications' && <NotificationsTab classes={classes} />}

        {activeTab === 'email' && <EmailCampaignsTab classes={classes} />}

        {activeTab === 'history' && (
          <div className="bg-white border rounded-xl overflow-hidden">
            {campaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No campaigns yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Audience</th>
                    <th className="px-4 py-3 text-left">Sent</th>
                    <th className="px-4 py-3 text-left">Failed</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.title}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">
                        {c.audience_type.replace(/_/g, ' ')}
                        {c.class_name ? ` · ${c.class_name}` : ''}
                      </td>
                      <td className="px-4 py-3 text-green-700">{c.sent_count}</td>
                      <td className="px-4 py-3 text-red-700">{c.failed_count}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(c.created_at).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <ConfirmDialog
          isOpen={showConfirm}
          title="Send SMS Campaign"
          message={`Send SMS to ${selectedRecipients.length} selected recipient(s)?`}
          confirmText="Yes, Send"
          cancelText="Cancel"
          type="warning"
          onConfirm={handleSend}
          onCancel={() => setShowConfirm(false)}
        />
      </div>
    </DashboardLayout>
  );
}

export default function CommunicationsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        </DashboardLayout>
      }
    >
      <CommunicationsPageContent />
    </Suspense>
  );
}
