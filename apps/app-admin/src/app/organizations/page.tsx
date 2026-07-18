'use client';

import { useCallback, useEffect, useState } from 'react';
import { PortalPageShell } from '@edulakhya/ui';
import type { OrganizationWithSubscription } from '@edulakhya/types';
import { OrganizationTable } from '@/features/subscriptions/components/SubscriptionUi';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/platform/organizations', { cache: 'no-store' });
      const payload = await response.json();
      if (payload.success) {
        setOrganizations(payload.data.organizations);
      } else {
        setError(payload.error || 'Failed to load organizations');
      }
    } catch {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  const handleOrganizationUpdated = useCallback((updated: OrganizationWithSubscription) => {
    setOrganizations((current) =>
      current.map((org) => (org.id === updated.id ? { ...org, ...updated } : org)),
    );
  }, []);

  return (
    <PortalPageShell
      title="Organizations"
      subtitle="Manage school groups, contact details, and active status"
    >
      {loading && <p className="text-sm text-slate-500">Loading organizations…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {!loading && !error && (
        <OrganizationTable
          organizations={organizations}
          onOrganizationUpdated={handleOrganizationUpdated}
        />
      )}
    </PortalPageShell>
  );
}
