'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import InventoryModuleLinks from '@/features/inventory/components/InventoryModuleLinks';

type Row = {
  id: number;
  created_at: string;
  user_name?: string;
  action: string;
  entity: string;
  entity_id?: number;
  details?: unknown;
};

export default function InventoryAuditPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch('/api/inventory/audit', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setRows(data.data || []);
      });
  }, []);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Audit Trail</h1>
          <p className="mt-1 text-sm text-gray-500">
            Writes are limited to Admin and Inventory Manager roles. Every create, post, assign and delete is logged here.
          </p>
        </div>
        <InventoryModuleLinks />
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Id</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">No audit entries yet</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 text-xs">{String(row.created_at).replace('T', ' ').slice(0, 19)}</td>
                    <td className="px-3 py-2">{row.user_name || '—'}</td>
                    <td className="px-3 py-2 capitalize">{row.action}</td>
                    <td className="px-3 py-2">{row.entity}</td>
                    <td className="px-3 py-2">{row.entity_id || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
