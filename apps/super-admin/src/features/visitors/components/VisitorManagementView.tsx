'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FiCheckCircle,
  FiClock,
  FiLogOut,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';
import RecordVisitorModal from '@/features/visitors/components/RecordVisitorModal';
import type { SchoolVisitor } from '@/lib/visitor-utils';
import { useDialog } from '@/shared/context/DialogContext';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function smsStatusLabel(status?: string | null) {
  switch (status) {
    case 'sent':
      return 'Sent';
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    case 'pending':
      return 'Pending';
    default:
      return '—';
  }
}

function smsStatusClass(status?: string | null) {
  switch (status) {
    case 'sent':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'skipped':
      return 'bg-gray-100 text-gray-700';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export default function VisitorManagementView() {
  const { alert, confirm } = useDialog();
  const [visitors, setVisitors] = useState<SchoolVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [scope, setScope] = useState<'today' | 'all'>('today');
  const [todayCount, setTodayCount] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (scope === 'today') params.set('scope', 'today');

      const response = await fetch(`/api/visitors?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load visitors');
      }

      setVisitors(result.data.items || []);
      setTodayCount(result.data.today_count || 0);
      setCheckedInCount(result.data.checked_in_count || 0);
    } catch (error) {
      await alert(error instanceof Error ? error.message : 'Failed to load visitors', {
        title: 'Error',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [scope, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVisitors();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchVisitors]);

  const handleCheckout = async (visitor: SchoolVisitor) => {
    const ok = await confirm(
      `Mark ${visitor.visitor_name} (${visitor.visitor_number}) as checked out?`,
      { title: 'Check out visitor?', confirmText: 'Check Out', type: 'warning' },
    );
    if (!ok) return;

    setActionId(visitor.id);
    try {
      const response = await fetch(`/api/visitors/${visitor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkout' }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Checkout failed');
      }
      await fetchVisitors();
    } catch (error) {
      await alert(error instanceof Error ? error.message : 'Could not check out visitor', {
        title: 'Checkout failed',
        type: 'error',
      });
    } finally {
      setActionId(null);
    }
  };

  const handleResendSms = async (visitor: SchoolVisitor) => {
    if (!visitor.host_phone) {
      await alert('Add a host mobile number before sending SMS.', {
        title: 'No host mobile',
        type: 'warning',
      });
      return;
    }

    setActionId(visitor.id);
    try {
      const response = await fetch(`/api/visitors/${visitor.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify' }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'SMS failed');
      }

      if (result.sms && !result.sms.success && !result.sms.skipped) {
        await alert(result.sms.error || 'Could not send notification', {
          title: 'SMS failed',
          type: 'error',
        });
      } else {
        await alert(`SMS sent to ${visitor.host_phone}`, {
          title: 'Notification sent',
          type: 'success',
        });
      }
      await fetchVisitors();
    } catch (error) {
      await alert(error instanceof Error ? error.message : 'Could not send notification', {
        title: 'SMS failed',
        type: 'error',
      });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FiUsers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Today&apos;s Visitors</p>
              <p className="text-2xl font-semibold text-gray-900">{todayCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <FiUserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Currently Inside</p>
              <p className="text-2xl font-semibold text-gray-900">{checkedInCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Quick action</p>
            <p className="text-sm text-gray-700 mt-1">Register a new visitor at the gate</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700"
          >
            <FiPlus className="w-4 h-4" />
            Register
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, pass, or host..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as 'today' | 'all')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="today">Today</option>
              <option value="all">All records</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All status</option>
              <option value="checked_in">Checked in</option>
              <option value="checked_out">Checked out</option>
            </select>
            <button
              type="button"
              onClick={() => fetchVisitors()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Pass</th>
                <th className="px-4 py-3 font-medium">Visitor</th>
                <th className="px-4 py-3 font-medium">Purpose</th>
                <th className="px-4 py-3 font-medium">Host</th>
                <th className="px-4 py-3 font-medium">Check-in</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">SMS</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    Loading visitors...
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    No visitors found for the selected filters.
                  </td>
                </tr>
              ) : (
                visitors.map((visitor) => (
                  <tr key={visitor.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-gray-900">{visitor.visitor_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{visitor.visitor_name}</div>
                      <div className="text-gray-500">{visitor.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{visitor.purpose}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{visitor.person_to_meet}</div>
                      {visitor.host_phone && (
                        <div className="text-gray-500">{visitor.host_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <FiClock className="w-3.5 h-3.5 text-gray-400" />
                        {formatDateTime(visitor.check_in_at)}
                      </div>
                      {visitor.check_out_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          Out: {formatDateTime(visitor.check_out_at)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          visitor.status === 'checked_in'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {visitor.status === 'checked_in' ? (
                          <>
                            <FiCheckCircle className="w-3 h-3" />
                            Inside
                          </>
                        ) : (
                          'Checked out'
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${smsStatusClass(visitor.sms_status)}`}
                      >
                        {smsStatusLabel(visitor.sms_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {visitor.host_phone && (
                          <button
                            type="button"
                            disabled={actionId === visitor.id}
                            onClick={() => handleResendSms(visitor)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs hover:bg-gray-50 disabled:opacity-50"
                            title="Resend SMS to host"
                          >
                            <FiSend className="w-3.5 h-3.5" />
                            SMS
                          </button>
                        )}
                        {visitor.status === 'checked_in' && (
                          <button
                            type="button"
                            disabled={actionId === visitor.id}
                            onClick={() => handleCheckout(visitor)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs hover:bg-gray-800 disabled:opacity-50"
                          >
                            <FiLogOut className="w-3.5 h-3.5" />
                            Check out
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RecordVisitorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          fetchVisitors();
          setShowModal(false);
        }}
      />
    </div>
  );
}
