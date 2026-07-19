'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PortalPageShell } from '@edulakhya/ui';
import { formatDate } from '@edulakhya/utils';
import {
  SubscriptionFormFields,
} from '@/features/subscriptions/components/SubscriptionUi';
import { authFetch } from '@/lib/auth';
import DeleteInactiveSchoolButton from '@/features/audit/components/DeleteInactiveSchoolButton';

type OrganizationDetail = {
  id: number;
  name: string;
  slug: string;
  school_code: string | null;
  is_active: boolean;
  max_schools: number | null;
  subscription_plan: string | null;
  school_count?: number;
  contact_name?: string | null;
  contact_email?: string | null;
  support_email?: string | null;
  support_phone?: string | null;
  subscription?: {
    id: number;
    plan: string;
    status: string;
    school_count_limit: number | null;
    student_count_limit: number | null;
    billing_cycle: string | null;
    valid_from: string | null;
    valid_until: string | null;
  } | null;
  schools: Array<{ id: number; name: string; slug: string; is_active: boolean }>;
};

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const [organization, setOrganization] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [orgLimits, setOrgLimits] = useState({ max_schools: '', is_active: true });
  const [subscriptionForm, setSubscriptionForm] = useState<Record<string, string>>({
    plan: 'standard',
    status: 'active',
    billing_cycle: 'annual',
    school_count_limit: '',
    student_count_limit: '',
    valid_from: '',
    valid_until: '',
  });

  useEffect(() => {
    void loadOrganization();
  }, [params.id]);

  async function loadOrganization() {
    try {
      const response = await authFetch(`/api/platform/organizations/${params.id}`, {
        cache: 'no-store',
      });
      const payload = await response.json();
      if (payload.success) {
        const org = payload.data.organization as OrganizationDetail;
        setOrganization(org);
        setOrgLimits({
          max_schools: org.max_schools != null ? String(org.max_schools) : '',
          is_active: org.is_active,
        });
        if (org.subscription) {
          setSubscriptionForm({
            plan: org.subscription.plan,
            status: org.subscription.status,
            billing_cycle: org.subscription.billing_cycle || 'annual',
            school_count_limit:
              org.subscription.school_count_limit != null
                ? String(org.subscription.school_count_limit)
                : '',
            student_count_limit:
              org.subscription.student_count_limit != null
                ? String(org.subscription.student_count_limit)
                : '',
            valid_from: org.subscription.valid_from || '',
            valid_until: org.subscription.valid_until || '',
          });
        }
      } else {
        setError(payload.error || 'Organization not found');
      }
    } catch {
      setError('Failed to load organization');
    } finally {
      setLoading(false);
    }
  }

  const handleOrgSave = async () => {
    if (!organization) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await authFetch(`/api/platform/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_schools: orgLimits.max_schools === '' ? null : orgLimits.max_schools,
          is_active: orgLimits.is_active,
        }),
      });
      const payload = await response.json();
      if (payload.success) {
        setOrganization(payload.data.organization);
        setMessage('Organization settings saved.');
      } else {
        setError(payload.error || 'Failed to save organization');
      }
    } catch {
      setError('Failed to save organization');
    } finally {
      setSaving(false);
    }
  };

  const handleSubscriptionSave = async () => {
    if (!organization) return;
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const isUpdate = Boolean(organization.subscription?.id);
      const url = isUpdate
        ? `/api/platform/subscriptions/${organization.subscription!.id}`
        : '/api/platform/subscriptions';
      const method = isUpdate ? 'PATCH' : 'POST';
      const body = isUpdate
        ? subscriptionForm
        : { ...subscriptionForm, organization_id: organization.id };

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (payload.success) {
        const refresh = await authFetch(`/api/platform/organizations/${organization.id}`, {
          cache: 'no-store',
        });
        const refreshed = await refresh.json();
        if (refreshed.success) {
          setOrganization(refreshed.data.organization);
        }
        setMessage(isUpdate ? 'Subscription updated.' : 'Subscription created.');
      } else {
        setError(payload.error || 'Failed to save subscription');
      }
    } catch {
      setError('Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalPageShell
      title={organization?.name || 'Organization'}
      subtitle={organization ? `${organization.slug} · ${organization.school_count ?? 0} schools` : undefined}
    >
      {loading && <p className="text-sm text-slate-500">Loading organization…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {organization && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="app-admin-card">
              <h2 className="app-admin-section-title">Contact details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="app-admin-meta-label">Primary contact</p>
                  <p className="app-admin-meta-value">{organization.contact_name || '—'}</p>
                </div>
                <div>
                  <p className="app-admin-meta-label">Contact email</p>
                  <p className="app-admin-meta-value break-all">
                    {organization.contact_email || organization.support_email || '—'}
                  </p>
                </div>
                <div>
                  <p className="app-admin-meta-label">Support email</p>
                  <p className="app-admin-meta-value break-all">{organization.support_email || '—'}</p>
                </div>
                <div>
                  <p className="app-admin-meta-label">Support phone</p>
                  <p className="app-admin-meta-value">{organization.support_phone || '—'}</p>
                </div>
              </div>
            </div>

            <div className="app-admin-card">
              <h2 className="app-admin-section-title">Organization settings</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="app-admin-meta-label">School code</p>
                  <p className="app-admin-meta-value">{organization.school_code || '—'}</p>
                </div>
                <div>
                  <p className="app-admin-meta-label">Legacy plan</p>
                  <p className="app-admin-meta-value">{organization.subscription_plan || '—'}</p>
                </div>
                <label className="block text-sm">
                  <span className="app-admin-label">Max schools</span>
                  <input
                    type="number"
                    min={1}
                    value={orgLimits.max_schools}
                    onChange={(e) => setOrgLimits({ ...orgLimits, max_schools: e.target.value })}
                    className="app-admin-field"
                    placeholder="Unlimited if empty"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm pt-6">
                  <input
                    type="checkbox"
                    checked={orgLimits.is_active}
                    onChange={(e) => setOrgLimits({ ...orgLimits, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span className="font-medium text-slate-800">Organization active</span>
                </label>
              </div>
              <button
                type="button"
                onClick={handleOrgSave}
                disabled={saving}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Save organization
              </button>
            </div>

            <div className="app-admin-card">
              <h2 className="app-admin-section-title">Campuses</h2>
              <ul className="mt-4 divide-y divide-slate-100">
                {organization.schools.map((school) => (
                  <li key={school.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{school.name}</p>
                      <p className="text-slate-500">{school.slug}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          school.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {school.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <a
                        href={`/school-audit?school=${school.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Audit
                      </a>
                      <DeleteInactiveSchoolButton
                        schoolId={school.id}
                        schoolSlug={school.slug}
                        schoolName={school.name}
                        isActive={school.is_active}
                        compact
                        onDeleted={() => void loadOrganization()}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="app-admin-card">
            <h2 className="app-admin-section-title">
              {organization.subscription ? 'Update subscription' : 'Create subscription'}
            </h2>
            {organization.subscription && (
              <p className="mt-1 text-sm text-slate-600">
                Current period ends {organization.subscription.valid_until ? formatDate(organization.subscription.valid_until) : '—'}
              </p>
            )}
            <div className="mt-4">
              <SubscriptionFormFields
                values={subscriptionForm}
                onChange={(field, value) =>
                  setSubscriptionForm((current) => ({ ...current, [field]: value }))
                }
              />
            </div>
            <button
              type="button"
              onClick={handleSubscriptionSave}
              disabled={saving}
              className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {organization.subscription ? 'Update subscription' : 'Create subscription'}
            </button>
          </section>
        </div>
      )}
    </PortalPageShell>
  );
}
