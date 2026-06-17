'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import type { FeesStatsData } from '@/features/fees/hooks/useFeesStats';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PIE_COLORS = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];
const DEFAULT_FEE_CATEGORIES = [
  'Tuition Fee',
  'Transport Fee',
  'Registration Fee',
  'Examination & Activity Fee',
  'Library Fee',
  'Sports Fee',
];

type CategoryRangeFilter = 'this_week' | 'this_month' | 'custom';

function normalizeCategoryName(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (v.includes('tuition') || v.includes('tution')) return 'Tuition Fee';
  if (v.includes('transport')) return 'Transport Fee';
  if (v.includes('registration') || v.includes('admission')) return 'Registration Fee';
  if (v.includes('exam') || v.includes('activity')) return 'Examination & Activity Fee';
  if (v.includes('library')) return 'Library Fee';
  if (v.includes('sport')) return 'Sports Fee';
  return raw || 'Other';
}

interface FeesDashboardChartsProps {
  stats: FeesStatsData;
}

export default function FeesDashboardCharts({ stats }: FeesDashboardChartsProps) {
  const [categoryRange, setCategoryRange] = useState<CategoryRangeFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [categoryStats, setCategoryStats] = useState<FeesStatsData>(stats);

  useEffect(() => {
    setCategoryStats(stats);
  }, [stats]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('range', categoryRange);
    if (categoryRange === 'custom') {
      if (customStartDate) params.set('start_date', customStartDate);
      if (customEndDate) params.set('end_date', customEndDate);
    }

    const loadCategoryData = async () => {
      try {
        const response = await fetch(`/api/fees/stats?${params.toString()}`, { cache: 'no-store' });
        const data = await response.json();
        if (data.success && data.data) {
          setCategoryStats(data.data);
        }
      } catch {
        setCategoryStats(stats);
      }
    };

    void loadCategoryData();
  }, [categoryRange, customEndDate, customStartDate, stats]);

  const monthlyTrend = (stats.monthly_trend || []).map((row) => ({
    label: `${MONTH_NAMES[Number(row.month) - 1] || row.month} ${String(row.year).slice(-2)}`,
    total: parseFloat(String(row.total)) || 0,
  }));

  const pendingVsCollected = [
    { name: 'Collected', value: stats.total_collected || 0 },
    { name: 'Pending', value: stats.total_pending || 0 },
    { name: 'Overdue', value: stats.total_overdue || 0 },
  ].filter((d) => d.value > 0);
  const pendingVsCollectedTotal = pendingVsCollected.reduce((sum, row) => sum + row.value, 0);

  const categoryTotals = new Map<string, number>();
  for (const row of categoryStats.collection_by_category || []) {
    const name = normalizeCategoryName(String(row.category || 'Other'));
    const total = parseFloat(String(row.total)) || 0;
    categoryTotals.set(name, (categoryTotals.get(name) || 0) + total);
  }

  for (const name of DEFAULT_FEE_CATEGORIES) {
    if (!categoryTotals.has(name)) categoryTotals.set(name, 0);
  }

  const categoryData = Array.from(categoryTotals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const topCategory = categoryData.find((item) => item.total > 0);
  const categoryTotalCollection = useMemo(
    () => categoryData.reduce((sum, item) => sum + item.total, 0),
    [categoryData],
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <ChartCard title="Monthly Collection Trend" className="xl:col-span-2">
        {monthlyTrend.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatFeeCurrency(v)} />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Pending vs Collected">
        {pendingVsCollected.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pendingVsCollected}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {pendingVsCollected.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatFeeCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              {pendingVsCollected.map((row, index) => {
                const percentage = pendingVsCollectedTotal > 0 ? (row.value / pendingVsCollectedTotal) * 100 : 0;
                return (
                  <div key={row.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-gray-600">{row.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatFeeCurrency(row.value)}</p>
                      <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Collection by Category"
        className="xl:col-span-3"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryRange}
              onChange={(e) => setCategoryRange(e.target.value as CategoryRangeFilter)}
              className="text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-white text-gray-700"
            >
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom</option>
            </select>
            {categoryRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1.5"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1.5"
                />
              </>
            )}
          </div>
        }
      >
        {categoryData.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatFeeCurrency(v)} />
                  <Bar dataKey="total" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500">Top Category</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{topCategory?.name || 'N/A'}</p>
                <p className="text-2xl font-semibold text-blue-700 mt-2">
                  {formatFeeCurrency(topCategory?.total || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {categoryTotalCollection > 0 && topCategory
                    ? `${((topCategory.total / categoryTotalCollection) * 100).toFixed(1)}% of total collection`
                    : '0% of total collection'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500">Total Collection</p>
                <p className="text-2xl font-semibold text-green-700 mt-2">
                  {formatFeeCurrency(categoryTotalCollection)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {categoryRange === 'this_week'
                    ? 'This Week'
                    : categoryRange === 'this_month'
                      ? 'This Month'
                      : 'Custom Range'}
                </p>
              </div>
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = '',
  action,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[260px] flex items-center justify-center text-sm text-gray-500">
      No data available for this period
    </div>
  );
}
