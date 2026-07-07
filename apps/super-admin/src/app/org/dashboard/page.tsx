'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiRefreshCw } from 'react-icons/fi';
import type { OrgAggregatedMetrics } from '@/lib/org-analytics';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default function OrgDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<OrgAggregatedMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (refresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/dashboard/stats${refresh ? '?refresh=1' : ''}`);
      const data = await res.json();
      if (data.success) setMetrics(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n.toLocaleString('en-IN');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl text-gray-900">Organization Dashboard</h1>
          <p className="text-sm text-gray-500">Consolidated metrics across all schools</p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
        >
          <FiRefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading && !metrics ? (
        <div className="py-12 text-center text-gray-500">Loading metrics…</div>
      ) : metrics ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
            <StatCard label="Schools" value={metrics.totals.schools} />
            <StatCard label="Students" value={metrics.totals.students.toLocaleString('en-IN')} />
            <StatCard label="Staff" value={metrics.totals.staff.toLocaleString('en-IN')} />
            <StatCard label="Teachers" value={metrics.totals.teachers.toLocaleString('en-IN')} />
            <StatCard label="Avg Attendance" value={`${metrics.totals.attendance_rate}%`} />
            <StatCard label="Fee Collected" value={fmt(metrics.totals.fee_collected)} />
            <StatCard label="Outstanding Fees" value={fmt(metrics.totals.fee_outstanding)} />
            <StatCard label="Pending Admissions" value={metrics.totals.admissions_pending} />
            <StatCard label="New Admissions (7d)" value={metrics.totals.admissions_new_week} />
            <StatCard label="Bus Fleet" value={metrics.totals.vehicles} />
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">School breakdown</h2>
              <p className="text-xs text-gray-500">Click a school to open its ERP</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">School</th>
                    <th className="px-3 py-2 text-right">Students</th>
                    <th className="px-3 py-2 text-right">Staff</th>
                    <th className="px-3 py-2 text-right">Fees Collected</th>
                    <th className="px-3 py-2 text-right">Outstanding</th>
                    <th className="px-3 py-2 text-right">Attendance</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {metrics.schools.map((school) => (
                    <tr key={school.school_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{school.school_name}</td>
                      <td className="px-3 py-2 text-right">{school.students}</td>
                      <td className="px-3 py-2 text-right">{school.staff}</td>
                      <td className="px-3 py-2 text-right">{fmt(school.fee_collected)}</td>
                      <td className="px-3 py-2 text-right">{fmt(school.fee_outstanding)}</td>
                      <td className="px-3 py-2 text-right">{school.attendance_rate}%</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch('/api/auth/switch-school', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ school_id: school.school_id }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              document.cookie = `token=${data.data.token}; path=/; max-age=604800; SameSite=Lax`;
                              router.push('/admin');
                            }
                          }}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                        >
                          Open ERP
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="py-12 text-center text-gray-500">Unable to load organization metrics.</div>
      )}
    </div>
  );
}
