'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';

export default function PlatformAdminPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/platform/overview')
      .then((r) => r.json())
      .then((d) => d.success && setData(d.data));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">EduLakhya Platform Console</h1>
          <p className="text-sm text-gray-500">All organizations and schools on this platform</p>
        </div>
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-gray-500">Organizations</p>
                <p className="text-2xl font-bold">{data.totals.organizations}</p>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-gray-500">Schools</p>
                <p className="text-2xl font-bold">{data.totals.schools}</p>
              </div>
            </div>
            <div className="rounded-xl border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Organization</th>
                    <th className="px-3 py-2 text-left">Slug</th>
                    <th className="px-3 py-2 text-left">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.organizations.map((o: any) => (
                    <tr key={o.id}>
                      <td className="px-3 py-2">{o.name}</td>
                      <td className="px-3 py-2">{o.slug}</td>
                      <td className="px-3 py-2">{o.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
