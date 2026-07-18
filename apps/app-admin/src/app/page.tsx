'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import KpiMetricCard from '@/components/dashboard/KpiMetricCard';
import QuickActionsCard from '@/components/dashboard/QuickActionsCard';
import RevenueOverviewCard from '@/components/dashboard/RevenueOverviewCard';
import SecondaryMetricStrip from '@/components/dashboard/SecondaryMetricStrip';
import SubscriptionStatusCard from '@/components/dashboard/SubscriptionStatusCard';
import { formatCurrency } from '@edulakhya/utils';
import type { OrganizationWithSubscription } from '@edulakhya/types';
import type { PlatformDashboardKpis } from '@/lib/platform-dashboard';
import { OrganizationTable } from '@/features/subscriptions/components/SubscriptionUi';

type DashboardData = {
  kpis: PlatformDashboardKpis;
  recent: OrganizationWithSubscription[];
  generated_at: string;
};

function pct(part: number, total: number): string {
  if (total <= 0) return '0% of total';
  return `${Math.round((part / total) * 100)}% of total`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/platform/overview', { cache: 'no-store' });
      const payload = await response.json();
      if (payload.success) {
        setData(payload.data);
      } else {
        setError(payload.error || 'Failed to load dashboard');
      }
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const kpis = data?.kpis;

  return (
    <div className="dashboard-shell">
      <DashboardHeader onRefresh={() => void loadDashboard(true)} refreshing={refreshing} />

      {loading && <p className="text-sm text-slate-500">Loading dashboard…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {kpis && data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiMetricCard
              title="Total Schools"
              value={kpis.total_schools}
              subtitle="All time"
              trend="+20%"
              sparkColor="#3b82f6"
            />
            <KpiMetricCard
              title="Active Schools"
              value={kpis.active_schools}
              subtitle={pct(kpis.active_schools, kpis.total_schools)}
              trend="+0%"
              sparkColor="#22c55e"
            />
            <KpiMetricCard
              title="Inactive Schools"
              value={kpis.inactive_schools}
              subtitle={pct(kpis.inactive_schools, kpis.total_schools)}
              trend="+0%"
              trendPositive={false}
              sparkColor="#eab308"
            />
            <KpiMetricCard
              title="Trial Schools"
              value={kpis.trial_schools}
              subtitle={pct(kpis.trial_schools, kpis.total_schools)}
              trend="+0%"
              trendPositive={false}
              sparkColor="#8b5cf6"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiMetricCard
              title="Expired Subscriptions"
              value={kpis.expired_subscriptions}
              subtitle={pct(kpis.expired_subscriptions, kpis.total_schools)}
              trend="+0%"
              trendPositive={false}
              sparkColor="#ef4444"
            />
            <KpiMetricCard
              title="New Schools This Month"
              value={kpis.new_schools_this_month}
              subtitle="vs last month"
              trend={kpis.new_schools_this_month > 0 ? '+100%' : '+0%'}
              sparkColor="#6366f1"
            />
            <KpiMetricCard
              title="Total Students"
              value={kpis.total_students}
              subtitle="All schools"
              trend="+15%"
              sparkColor="#2563eb"
            />
            <KpiMetricCard
              title="Total Teachers"
              value={kpis.total_teachers}
              subtitle="All schools"
              trend="+0%"
              sparkColor="#16a34a"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <RevenueOverviewCard monthlyRevenue={kpis.monthly_revenue} />
            </div>
            <div className="xl:col-span-3">
              <SubscriptionStatusCard
                active={kpis.active_schools}
                trial={kpis.trial_schools}
                expired={kpis.expired_subscriptions}
                inactive={kpis.inactive_schools}
              />
            </div>
            <div className="xl:col-span-4">
              <QuickActionsCard />
            </div>
          </div>

          <SecondaryMetricStrip
            metrics={[
              {
                label: 'Pending Payments',
                value: formatCurrency(kpis.pending_payments),
                hint: 'Outstanding dues',
                accent: 'amber',
              },
              {
                label: 'Open Support Tickets',
                value: String(kpis.open_support_tickets),
                hint: 'Awaiting response',
                accent: 'purple',
              },
              {
                label: 'System Health',
                value: `${kpis.system_health_percent}%`,
                hint: 'All systems operational',
                accent: 'green',
              },
              {
                label: 'Database Usage',
                value: `${kpis.database_count} DBs`,
                hint: 'Across all organizations',
                accent: 'blue',
              },
              {
                label: 'Daily Active Users',
                value: String(kpis.daily_active_users),
                hint: 'Users today',
                accent: 'slate',
              },
              {
                label: 'Login Success Rate',
                value: `${kpis.login_success_rate}%`,
                hint: 'Successful logins',
                accent: 'green',
              },
            ]}
          />

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Recent Organizations</h2>
                <p className="text-sm text-slate-500">
                  Active subscriptions: {kpis.active_subscriptions} · Expiring in 30 days:{' '}
                  {kpis.expiring_soon}
                </p>
              </div>
              <Link
                href="/organizations"
                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                View all organizations →
              </Link>
            </div>

            <div className="dashboard-table-wrap">
              <OrganizationTable organizations={data.recent} showActions />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
