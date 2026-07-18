'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PortalPageShell } from '@edulakhya/ui';
import { formatDate } from '@edulakhya/utils';
import type { OrganizationSubscription } from '@edulakhya/types';

type SubscriptionRow = OrganizationSubscription & {
  organization_name: string;
  organization_slug: string;
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/platform/subscriptions', { cache: 'no-store' });
        const payload = await response.json();
        if (payload.success) {
          setSubscriptions(payload.data.subscriptions);
        } else {
          setError(payload.error || 'Failed to load subscriptions');
        }
      } catch {
        setError('Failed to load subscriptions');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return subscriptions;
    return subscriptions.filter((item) => item.status === statusFilter);
  }, [subscriptions, statusFilter]);

  return (
    <PortalPageShell
      title="Subscriptions"
      subtitle="All subscription records across organizations"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">
          Filter by status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ml-2 rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="past_due">Past due</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </label>
        <Link
          href="/organizations"
          className="ml-auto text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          Manage by organization
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading subscriptions…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Organization</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Plan</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Billing</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Limits</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Valid until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <Link
                        href={`/organizations/${item.organization_id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {item.organization_name}
                      </Link>
                      <p className="text-xs text-slate-500">{item.organization_slug}</p>
                    </td>
                    <td className="px-4 py-3">{item.plan}</td>
                    <td className="px-4 py-3">{item.status}</td>
                    <td className="px-4 py-3">{item.billing_cycle || '—'}</td>
                    <td className="px-4 py-3">
                      {item.school_count_limit ?? '∞'} schools · {item.student_count_limit ?? '∞'} students
                    </td>
                    <td className="px-4 py-3">
                      {item.valid_until ? formatDate(item.valid_until) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No subscriptions found.</div>
          )}
        </div>
      )}
    </PortalPageShell>
  );
}
