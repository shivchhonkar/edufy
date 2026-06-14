'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '@/shared/components/common/ConfirmDialog';
import {
  AUDIENCE_OPTIONS,
  formatAudienceLabel,
  formatDateTime,
} from '@/features/communications/constants';
import {
  FiAlertCircle,
  FiCheckSquare,
  FiMail,
  FiRefreshCw,
  FiSend,
  FiSquare,
  FiUsers,
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

interface EmailRecipient {
  email: string;
  name: string;
  student_id?: number;
  student_name?: string;
}

interface EmailCampaign {
  id: number;
  title: string;
  subject: string;
  body_text: string;
  audience_type: string;
  class_name?: string | null;
  section_name?: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
}

function recipientKey(email: string): string {
  return email.trim().toLowerCase();
}

interface EmailCampaignsTabProps {
  classes: ClassOption[];
}

export default function EmailCampaignsTab({ classes }: EmailCampaignsTabProps) {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [emailConfig, setEmailConfig] = useState<{
    emailReady: boolean;
    resendApiKeySet: boolean;
    fromAddressSet: boolean;
    fromAddress: string | null;
  } | null>(null);

  const [audienceType, setAudienceType] = useState('all_parents');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch('/api/communications/emails');
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data);
        if (data.config) setEmailConfig(data.config);
      }
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  const fetchRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    setError('');
    try {
      let url = `/api/communications/email-recipients?audience_type=${audienceType}`;
      if (classId) url += `&class_id=${classId}`;
      if (sectionId) url += `&section_id=${sectionId}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const list: EmailRecipient[] = data.data;
        setRecipients(list);
        setSelectedKeys(new Set(list.map((r) => recipientKey(r.email))));
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
    fetchCampaigns();
  }, [fetchCampaigns]);

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
    () => recipients.filter((r) => selectedKeys.has(recipientKey(r.email))),
    [recipients, selectedKeys]
  );

  const allSelected =
    recipients.length > 0 && selectedKeys.size === recipients.length;

  const toggleRecipient = (email: string) => {
    const key = recipientKey(email);
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
      setSelectedKeys(new Set(recipients.map((r) => recipientKey(r.email))));
    }
  };

  const handleSend = async () => {
    setShowConfirm(false);
    setSending(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/communications/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || subject.trim() || 'Email Campaign',
          subject,
          body_text: bodyText,
          audience_type: audienceType,
          class_id: classId ? parseInt(classId, 10) : null,
          section_id: sectionId ? parseInt(sectionId, 10) : null,
          selected_recipients: selectedRecipients,
        }),
      });

      const data = await res.json();
      if (data.success || data.data?.queued > 0) {
        setSuccess(data.message || 'Email campaign saved');
        setTitle('');
        setSubject('');
        setBodyText('');
        fetchCampaigns();
      } else {
        setError(data.error || 'Email campaign failed');
      }
    } catch {
      setError('Email campaign failed');
    } finally {
      setSending(false);
    }
  };

  const needsClass =
    audienceType === 'class_parents' || audienceType === 'section_parents';

  const canSend =
    subject.trim() &&
    bodyText.trim() &&
    selectedRecipients.length > 0 &&
    !sending;

  const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sending: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    queued: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="space-y-6">
      {emailConfig && !emailConfig.emailReady && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-sm">
          <FiAlertCircle className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Email delivery not configured</p>
            <p className="mt-1">
              Campaigns will be saved and recipients queued. Add to{' '}
              <code className="bg-amber-100 px-1 rounded">.env.local</code>:
            </p>
            <ul className="list-disc ml-5 mt-1">
              <li>
                <code>RESEND_API_KEY</code> —{' '}
                {emailConfig.resendApiKeySet ? 'set' : 'missing'}
              </li>
              <li>
                <code>SMTP_FROM</code> or <code>EMAIL_FROM</code> —{' '}
                {emailConfig.fromAddressSet ? emailConfig.fromAddress : 'missing'}
              </li>
            </ul>
          </div>
        </div>
      )}

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

      <div className="flex flex-wrap items-center gap-2 justify-end">
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <FiSend />
          {sending ? 'Sending...' : `Send (${selectedRecipients.length})`}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiMail className="text-primary-600" />
            Compose Email
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Annual Day Invitation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Email subject line"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={10}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Write your email message..."
              />
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
          <div className="max-h-[420px] overflow-y-auto">
            {loadingRecipients ? (
              <div className="text-center py-12 text-gray-500 text-sm">Loading...</div>
            ) : recipients.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No email addresses for this audience.
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
                      >
                        {allSelected ? (
                          <FiCheckSquare size={18} className="text-primary-600" />
                        ) : (
                          <FiSquare size={18} />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Student</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recipients.map((r, i) => {
                    const key = recipientKey(r.email);
                    const checked = selectedKeys.has(key);
                    return (
                      <tr
                        key={`${key}-${i}`}
                        className={`hover:bg-gray-50 ${checked ? '' : 'opacity-60'}`}
                      >
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => toggleRecipient(r.email)}
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
                        <td className="px-4 py-2 text-gray-600">{r.email}</td>
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

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Campaign History</h2>
        </div>
        {loadingCampaigns ? (
          <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No email campaigns yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Audience</th>
                <th className="px-4 py-3 text-left">Sent</th>
                <th className="px-4 py-3 text-left">Failed</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-gray-500">{c.subject}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">
                    {formatAudienceLabel(c.audience_type, c.class_name, c.section_name)}
                  </td>
                  <td className="px-4 py-3 text-green-700">{c.sent_count}</td>
                  <td className="px-4 py-3 text-red-700">{c.failed_count}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[c.status] || ''}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Send Email Campaign"
        message={`Send email to ${selectedRecipients.length} selected recipient(s)?`}
        confirmText="Yes, Send"
        cancelText="Cancel"
        type="warning"
        onConfirm={handleSend}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
