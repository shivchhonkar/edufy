'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrNav from '@/features/hr/components/HrNav';

function HrReportsPageContent() {
  const searchParams = useSearchParams();
  const now = new Date();
  const [reportType, setReportType] = useState('headcount');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<Record<string, unknown> | unknown[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const type = searchParams.get('type');
    if (type) setReportType(type);
  }, [searchParams]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type: reportType });
    if (['attendance', 'payroll'].includes(reportType)) {
      params.set('month', String(month));
      params.set('year', String(year));
    } else if (reportType === 'leave') {
      params.set('year', String(year));
    }
    const res = await fetch(`/api/hr/reports?${params}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, [reportType, month, year]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <HrNav />
        <h1 className="text-xl mb-4">HR Reports & Analytics</h1>
        <div className="flex flex-wrap gap-3 mb-6">
          {['headcount', 'attendance', 'leave', 'payroll'].map((t) => (
            <button key={t} type="button" onClick={() => setReportType(t)}
              className={`px-4 py-2 text-xs capitalize ${reportType === t ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>{t}</button>
          ))}
          {['attendance', 'payroll'].includes(reportType) && (
            <>
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} className="border rounded-lg px-3 py-2 text-sm">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
              <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} className="border rounded-lg px-3 py-2 text-sm w-24" />
            </>
          )}
        </div>

        {loading ? <p className="text-gray-400">Loading report...</p> : (
          <>
            {reportType === 'headcount' && data && typeof data === 'object' && !Array.isArray(data) && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  {['active', 'inactive', 'resigned', 'total'].map((k) => (
                    <div key={k} className="bg-white border rounded-xl p-4">
                      <p className="text-xs text-gray-500 capitalize">{k}</p>
                      <p className="text-xl">{String((data as Record<string, Record<string, number>>).summary?.[k] ?? 0)}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white border rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr><th className="text-left px-5 py-3">Department</th><th className="text-right px-5 py-3">Active</th><th className="text-right px-5 py-3">Total</th></tr>
                    </thead>
                    <tbody>
                      {((data as Record<string, unknown[]>).byDepartment || []).map((d: Record<string, unknown>) => (
                        <tr key={String(d.department)} className="border-b">
                          <td className="px-5 py-3">{String(d.department)}</td>
                          <td className="px-5 py-3 text-right">{String(d.active)}</td>
                          <td className="px-5 py-3 text-right">{String(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {reportType === 'attendance' && Array.isArray(data) && (
              <div className="bg-white border rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-5 py-3">Employee</th>
                      <th className="text-right px-5 py-3">Present</th>
                      <th className="text-right px-5 py-3">Absent</th>
                      <th className="text-right px-5 py-3">Late</th>
                      <th className="text-right px-5 py-3">On Leave</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((r: Record<string, unknown>) => (
                      <tr key={String(r.employee_id)} className="border-b">
                        <td className="px-5 py-3">{String(r.first_name)} {String(r.last_name)}</td>
                        <td className="px-5 py-3 text-right text-green-600">{String(r.present)}</td>
                        <td className="px-5 py-3 text-right text-red-600">{String(r.absent)}</td>
                        <td className="px-5 py-3 text-right text-amber-600">{String(r.late)}</td>
                        <td className="px-5 py-3 text-right">{String(r.on_leave)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {reportType === 'leave' && Array.isArray(data) && (
              <div className="bg-white border rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr><th className="text-left px-5 py-3">Leave Type</th><th className="text-right px-5 py-3">Requests</th><th className="text-right px-5 py-3">Approved</th><th className="text-right px-5 py-3">Days Taken</th></tr>
                  </thead>
                  <tbody>
                    {data.map((r: Record<string, unknown>) => (
                      <tr key={String(r.leave_type)} className="border-b">
                        <td className="px-5 py-3">{String(r.leave_type)}</td>
                        <td className="px-5 py-3 text-right">{String(r.requests)}</td>
                        <td className="px-5 py-3 text-right">{String(r.approved)}</td>
                        <td className="px-5 py-3 text-right">{String(r.days_taken)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {reportType === 'payroll' && data && typeof data === 'object' && !Array.isArray(data) && (
              <div className="space-y-4">
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-sm text-gray-500">Total Payroll</p>
                  <p className="text-xl">₹{parseFloat(String((data as Record<string, Record<string, number>>).totals?.total_net || 0)).toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{String((data as Record<string, Record<string, number>>).totals?.staff_count || 0)} staff</p>
                </div>
                <div className="bg-white border rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr><th className="text-left px-5 py-3">Department</th><th className="text-right px-5 py-3">Staff</th><th className="text-right px-5 py-3">Total Net</th></tr>
                    </thead>
                    <tbody>
                      {((data as Record<string, unknown[]>).byDepartment || []).map((d: Record<string, unknown>) => (
                        <tr key={String(d.department)} className="border-b">
                          <td className="px-5 py-3">{String(d.department)}</td>
                          <td className="px-5 py-3 text-right">{String(d.staff_count)}</td>
                          <td className="px-5 py-3 text-right">₹{parseFloat(String(d.total_net || 0)).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function HrReportsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        </DashboardLayout>
      }
    >
      <HrReportsPageContent />
    </Suspense>
  );
}
