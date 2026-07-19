'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { OrganizationWithSubscription } from '@edulakhya/types';
import { formatDate } from '@edulakhya/utils';
import { authFetch } from '@/lib/auth';

function statusBadgeClass(status?: string | null): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800';
    case 'trial':
      return 'bg-blue-100 text-blue-800';
    case 'past_due':
      return 'bg-amber-100 text-amber-800';
    case 'cancelled':
    case 'expired':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function orgActiveBadgeClass(isActive: boolean): string {
  return isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700';
}

function formatOrganizationContact(org: OrganizationWithSubscription): {
  name: string;
  email: string;
  phone: string;
} {
  return {
    name: org.contact_name?.trim() || '—',
    email: org.contact_email?.trim() || org.support_email?.trim() || '—',
    phone: org.support_phone?.trim() || '—',
  };
}

export function OrganizationActiveToggle({
  organizationId,
  isActive,
  disabled,
  onUpdated,
}: {
  organizationId: number;
  isActive: boolean;
  disabled?: boolean;
  onUpdated: (nextActive: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const active = isActive !== false;

  const handleToggle = async () => {
    if (loading || disabled) return;
    const nextActive = !active;
    setLoading(true);
    try {
      const response = await authFetch(`/api/platform/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive }),
      });
      const payload = await response.json();
      if (payload.success) {
        onUpdated(nextActive);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={active ? 'Deactivate organization' : 'Activate organization'}
        disabled={loading || disabled}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          active ? 'bg-emerald-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            active ? 'translate-x-5' : 'translate-x-0.5'
          } mt-0.5`}
        />
      </button>
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${orgActiveBadgeClass(active)}`}
      >
        {active ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
}

export function OrganizationTable({
  organizations,
  showActions = true,
  onOrganizationUpdated,
}: {
  organizations: OrganizationWithSubscription[];
  showActions?: boolean;
  onOrganizationUpdated?: (organization: OrganizationWithSubscription) => void;
}) {
  if (organizations.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No organizations found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white text-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50/90">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Organization</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Contact</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Schools</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Plan</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Plan status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Org status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Valid until</th>
              {showActions && (
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {organizations.map((org) => {
              const sub = org.subscription;
              const contact = formatOrganizationContact(org);
              const orgActive = org.is_active !== false;
              return (
                <tr key={org.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{org.name}</p>
                      <p className="text-xs text-slate-500">{org.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="min-w-[180px] space-y-1 text-slate-700">
                      <p className="font-medium text-slate-900">{contact.name}</p>
                      <p className="text-xs break-all">{contact.email}</p>
                      <p className="text-xs text-slate-600">{contact.phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{org.school_code || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{org.school_count ?? 0}</td>
                  <td className="px-4 py-3 text-slate-700">{sub?.plan || org.subscription_plan || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(sub?.status)}`}
                    >
                      {sub?.status || 'none'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <OrganizationActiveToggle
                      organizationId={org.id}
                      isActive={orgActive}
                      onUpdated={(nextActive) =>
                        onOrganizationUpdated?.({ ...org, is_active: nextActive })
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {sub?.valid_until ? formatDate(sub.valid_until) : '—'}
                  </td>
                  {showActions && (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/organizations/${org.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Manage
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SubscriptionFormFields({
  values,
  onChange,
}: {
  values: Record<string, string | number | boolean | null | undefined>;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="app-admin-label">Plan</span>
        <input
          value={String(values.plan ?? '')}
          onChange={(e) => onChange('plan', e.target.value)}
          className="app-admin-field"
          placeholder="standard, premium, enterprise"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="app-admin-label">Status</span>
        <select
          value={String(values.status ?? 'active')}
          onChange={(e) => onChange('status', e.target.value)}
          className="app-admin-field"
        >
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="past_due">Past due</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="app-admin-label">Billing cycle</span>
        <select
          value={String(values.billing_cycle ?? 'annual')}
          onChange={(e) => onChange('billing_cycle', e.target.value)}
          className="app-admin-field"
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="app-admin-label">School limit</span>
        <input
          type="number"
          min={1}
          value={String(values.school_count_limit ?? '')}
          onChange={(e) => onChange('school_count_limit', e.target.value)}
          className="app-admin-field"
          placeholder="Unlimited if empty"
        />
      </label>
      <label className="block text-sm">
        <span className="app-admin-label">Student limit</span>
        <input
          type="number"
          min={1}
          value={String(values.student_count_limit ?? '')}
          onChange={(e) => onChange('student_count_limit', e.target.value)}
          className="app-admin-field"
          placeholder="Unlimited if empty"
        />
      </label>
      <label className="block text-sm">
        <span className="app-admin-label">Valid from</span>
        <input
          type="date"
          value={String(values.valid_from ?? '')}
          onChange={(e) => onChange('valid_from', e.target.value)}
          className="app-admin-field"
        />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="app-admin-label">Valid until</span>
        <input
          type="date"
          value={String(values.valid_until ?? '')}
          onChange={(e) => onChange('valid_until', e.target.value)}
          className="app-admin-field"
        />
      </label>
    </div>
  );
}
