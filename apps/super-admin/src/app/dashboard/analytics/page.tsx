'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import KpiCard from '@/features/dashboard/components/KpiCard';
import {
  AttendanceTrendChart,
  FeeCollectionBarChart,
  CategoryBarChart,
} from '@/features/dashboard/components/DashboardCharts';
import type { AnalyticsOverview } from '@/shared/types';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import {
  FiBarChart2,
  FiUsers,
  FiUserCheck,
  FiUserPlus,
  FiAward,
  FiTrendingUp,
  FiArrowLeft,
} from 'react-icons/fi';
import Link from 'next/link';

function formatCurrency(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/analytics')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const k = data?.kpis;

const CHART_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#64748b', '#0d9488', '#ea580c'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/dashboard" className="hover:text-primary-600 flex items-center gap-1">
                <FiArrowLeft size={14} /> Dashboard
              </Link>
            </div>
            <h1 className="text-xl text-gray-900 flex items-center gap-2">
              <FiBarChart2 className="text-primary-600" />
              Analytics
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              School-wide trends across attendance, fees, admissions, and staffing.
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16 text-gray-500">Loading analytics…</div>
        )}

        {!loading && data && k && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard
                title="Students"
                value={k.total_students}
                subtitle={`${k.total_classes} classes · ${k.total_teachers} teachers`}
                icon={FiUsers}
                color="blue"
                onClick={() => router.push('/students')}
              />
              <KpiCard
                title="Fee Collection"
                value={formatCurrency(k.fees_collected)}
                subtitle={`${k.collection_rate}% collected · ${formatCurrency(k.pending_fees)} pending`}
                icon={RupeeIcon}
                color="green"
                onClick={() => router.push('/fees')}
              />
              <KpiCard
                title="Attendance"
                value={k.attendance_rate_today > 0 ? `${k.attendance_rate_today}%` : '—'}
                subtitle={`7d avg ${k.avg_attendance_7d}% · 30d avg ${k.avg_attendance_30d}%`}
                icon={FiUserCheck}
                color="indigo"
                onClick={() => router.push('/attendance/students')}
              />
              <KpiCard
                title="Admissions"
                value={k.active_admissions}
                subtitle={`${k.new_admissions_month} new this month · ${k.upcoming_exams} exams`}
                icon={FiUserPlus}
                color="purple"
                onClick={() => router.push('/admissions')}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartPanel title="Attendance Trend" subtitle="Last 30 days">
                <AttendanceTrendChart data={data.attendance_trend_30d} />
              </ChartPanel>
              <ChartPanel title="Fee Collection" subtitle="Expected, received & due — session months">
                <FeeCollectionBarChart data={data.fee_collection_12m} formatValue={formatCurrency} />
              </ChartPanel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartPanel title="Admission Inquiries" subtitle="Last 6 months">
                <CategoryBarChart
                  data={data.admissions_trend_6m.map((row, i) => ({
                    name: row.label,
                    value: row.count,
                    color: CHART_COLORS[i % CHART_COLORS.length],
                  }))}
                />
              </ChartPanel>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Metrics</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total Staff', value: k.total_staff, icon: FiUsers },
                    { label: 'Payments This Month', value: k.fee_payments_month, icon: RupeeIcon },
                    { label: 'Collection Rate', value: `${k.collection_rate}%`, icon: FiTrendingUp },
                    { label: 'Upcoming Exams', value: k.upcoming_exams, icon: FiAward },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                      </div>
                      <p className="text-lg text-gray-900 mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
