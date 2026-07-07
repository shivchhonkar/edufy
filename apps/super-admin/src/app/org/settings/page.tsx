'use client';

import { useEffect, useState } from 'react';

export default function OrgSettingsPage() {
  const [sub, setSub] = useState<any>(null);

  useEffect(() => {
    fetch('/api/org/subscription')
      .then((r) => r.json())
      .then((d) => d.success && setSub(d.data));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl text-gray-900">Subscription & Billing</h1>
        <p className="text-sm text-gray-500">Organization plan and limits</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm max-w-lg">
        {sub ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Organization</dt>
              <dd className="font-medium">{sub.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Type</dt>
              <dd>{sub.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Max schools</dt>
              <dd>{sub.max_schools ?? 'Unlimited'}</dd>
            </div>
            {sub.subscription && (
              <>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Plan</dt>
                  <dd>{sub.subscription.plan}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status</dt>
                  <dd>{sub.subscription.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Valid until</dt>
                  <dd>{sub.subscription.valid_until || '—'}</dd>
                </div>
              </>
            )}
          </dl>
        ) : (
          <p className="text-sm text-gray-500">Loading subscription…</p>
        )}
        <p className="mt-4 text-xs text-gray-400">
          Billing integration hooks are ready via organization_subscriptions table.
        </p>
      </div>
    </div>
  );
}
