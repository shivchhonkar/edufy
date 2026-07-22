'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import {
  FiBook,
  FiClock,
  FiLayers,
  FiPlus,
  FiRefreshCw,
  FiUpload,
  FiUser,
} from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CHART_HEIGHT = 220;
const CHART_COLORS = { primary: '#2563EB', success: '#059669', muted: '#94A3B8' };

interface LibraryMetrics {
  totalBooks: number;
  totalTitles: number;
  availableBooks: number;
  issuedBooks: number;
  overdueBooks: number;
  lostBooks: number;
  reservedBooks: number;
  activeMembers: number;
  newArrivals: number;
  fineCollectionToday: number;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

export default function LibraryDashboardPage() {
  const [metrics, setMetrics] = useState<LibraryMetrics>({
    totalBooks: 0,
    totalTitles: 0,
    availableBooks: 0,
    issuedBooks: 0,
    overdueBooks: 0,
    lostBooks: 0,
    reservedBooks: 0,
    activeMembers: 0,
    newArrivals: 0,
    fineCollectionToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [issuedVsReturned, setIssuedVsReturned] = useState<Array<{ name: string; value: number }>>(
    [],
  );
  const [recentTransactions, setRecentTransactions] = useState<
    Array<{ id: number; member: string; book: string; type: 'Issued' | 'Returned'; date: string }>
  >([]);
  const [overdueBooks, setOverdueBooks] = useState<
    Array<{ id: number; barcode: string; title: string; member: string; dueDate: string; daysOverdue: number }>
  >([]);
  const [topIssuedBooks, setTopIssuedBooks] = useState<Array<{ name: string; issued: number }>>([]);
  const [booksByCategory, setBooksByCategory] = useState<Array<{ name: string; count: number }>>([]);
  const [circulationTrend, setCirculationTrend] = useState<
    Array<{ date: string; Issued: number; Returned: number }>
  >([]);

  const load = useCallback(async () => {
    try {
      const [metricsRes, issuesRes, booksRes, categoriesRes] = await Promise.all([
        fetch('/api/library/metrics'),
        fetch('/api/library/issues'),
        fetch('/api/library/books'),
        fetch('/api/library/categories'),
      ]);

      const [metricsData, issuesData, booksData, categoriesData] = await Promise.all([
        metricsRes.json(),
        issuesRes.json(),
        booksRes.json(),
        categoriesRes.json(),
      ]);

      if (metricsData.success) setMetrics(metricsData.data);

      if (issuesData.success) {
        const issues = issuesData.data || [];
        const issued = issues.filter((i: { status: string }) => i.status === 'issued').length;
        const returned = issues.filter((i: { status: string }) => i.status === 'returned').length;
        setIssuedVsReturned([
          { name: 'Issued', value: issued },
          { name: 'Returned', value: returned },
        ]);

        const recent = issues
          .slice(-8)
          .map((i: {
            id: number;
            status: string;
            issued_at: string;
            returned_at: string;
            member?: { name?: string };
            book?: { title?: string };
          }) => ({
            id: i.id,
            member: i.member?.name || 'Unknown',
            book: i.book?.title || 'Unknown',
            type: i.status === 'issued' ? ('Issued' as const) : ('Returned' as const),
            date: i.status === 'issued' ? i.issued_at : i.returned_at,
          }))
          .reverse();
        setRecentTransactions(recent);

        const today = new Date();
        const overdue = issues
          .filter(
            (i: { status: string; due_at: string }) =>
              i.status === 'issued' && new Date(i.due_at) < today,
          )
          .map(
            (i: {
              id: number;
              due_at: string;
              copy?: { barcode?: string };
              book?: { title?: string };
              member?: { name?: string };
            }) => ({
              id: i.id,
              barcode: i.copy?.barcode || 'N/A',
              title: i.book?.title || 'Unknown',
              member: i.member?.name || 'Unknown',
              dueDate: i.due_at,
              daysOverdue: Math.floor(
                (today.getTime() - new Date(i.due_at).getTime()) / (1000 * 60 * 60 * 24),
              ),
            }),
          );
        setOverdueBooks(overdue);

        const trendMap: Record<string, { Issued: number; Returned: number }> = {};
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        issues.forEach(
          (i: { status: string; issued_at: string; returned_at: string }) => {
            const dateStr = i.status === 'issued' ? i.issued_at : i.returned_at;
            const date = new Date(dateStr);
            if (date >= sevenDaysAgo && date <= today) {
              const key = formatShortDate(dateStr);
              if (!trendMap[key]) trendMap[key] = { Issued: 0, Returned: 0 };
              if (i.status === 'issued') trendMap[key].Issued++;
              else trendMap[key].Returned++;
            }
          },
        );
        setCirculationTrend(Object.entries(trendMap).map(([date, data]) => ({ date, ...data })));
      }

      if (booksData.success) {
        const books = booksData.data || [];
        const topBooks = books
          .map((b: { title: string; copies?: Array<{ status: string }> }) => ({
            name: b.title.length > 18 ? `${b.title.slice(0, 18)}…` : b.title,
            issued: (b.copies || []).filter((c) => c.status === 'issued').length,
          }))
          .sort((a: { issued: number }, b: { issued: number }) => b.issued - a.issued)
          .slice(0, 5);
        setTopIssuedBooks(topBooks);

        if (categoriesData.success) {
          const categories = categoriesData.data || [];
          const byCat = categories
            .map((c: { id: number; name: string }) => ({
              name: c.name.length > 12 ? `${c.name.slice(0, 12)}…` : c.name,
              count: books.filter((b: { category_id: number }) => b.category_id === c.id).length,
            }))
            .filter((c: { count: number }) => c.count > 0);
          setBooksByCategory(byCat);
        }
      }
    } catch (err) {
      console.error('Failed to load library data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const statCards = [
    { label: 'Total Books', value: metrics.totalBooks, tone: 'blue', href: '/library/catalog/books' },
    { label: 'Available', value: metrics.availableBooks, tone: 'green' },
    { label: 'Issued', value: metrics.issuedBooks, tone: 'indigo', href: '/library/circulation/issue' },
    { label: 'Overdue', value: metrics.overdueBooks, tone: 'red', href: '/library/fines' },
    { label: 'Members', value: metrics.activeMembers, tone: 'purple', href: '/library/members' },
    { label: 'Titles', value: metrics.totalTitles, tone: 'amber' },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-4 pb-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Library Dashboard</h1>
            {/* <p className="mt-0.5 text-sm text-gray-600">
              Catalog, circulation, members, and overdue overview
            </p> */}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={15} />
            Refresh
          </button>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {statCards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <QuickAction href="/library/circulation/issue" icon={FiUpload} label="Issue Book" primary />
              <QuickAction href="/library/circulation/return" icon={FiBook} label="Return Book" />
              <QuickAction href="/library/catalog/books" icon={FiPlus} label="Add Book" />
              <QuickAction href="/library/members" icon={FiUser} label="Members" />
              <QuickAction href="/library/masters/categories" icon={FiLayers} label="Categories" />
              <QuickAction href="/library/reports" icon={FiClock} label="Reports" />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Panel title="Issued vs Returned" icon={FiBook}>
                {issuedVsReturned.length > 0 ? (
                  <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                    <PieChart>
                      <Pie
                        data={issuedVsReturned}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell fill={CHART_COLORS.primary} />
                        <Cell fill={CHART_COLORS.success} />
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </Panel>

              <Panel
                title="Recent Transactions"
                icon={FiUser}
                action={
                  <Link href="/library/circulation" className="text-xs text-primary-600 hover:underline">
                    View all
                  </Link>
                }
              >
                {recentTransactions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">No recent transactions</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {recentTransactions.slice(0, 6).map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{t.member}</p>
                          <p className="truncate text-xs text-gray-500">{t.book}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              t.type === 'Issued'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {t.type}
                          </span>
                          <span className="text-xs text-gray-500">{formatShortDate(t.date)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Panel title="Top Issued Books" icon={FiBook}>
                {topIssuedBooks.length > 0 ? (
                  <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                    <BarChart data={topIssuedBooks} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="issued" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </Panel>

              <Panel title="Books by Category" icon={FiLayers}>
                {booksByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                    <BarChart data={booksByCategory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </Panel>
            </div>

            <Panel title="Circulation Trend (Last 7 Days)" icon={FiClock}>
              {circulationTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <LineChart data={circulationTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="Issued"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Returned"
                      stroke={CHART_COLORS.success}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </Panel>

            <Panel
              title="Overdue Books"
              icon={FiClock}
              action={
                <Link href="/library/fines" className="text-xs text-primary-600 hover:underline">
                  View all
                </Link>
              }
            >
              {overdueBooks.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">No overdue books</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="pb-2 pr-3 font-semibold">Book</th>
                        <th className="pb-2 pr-3 font-semibold">Member</th>
                        <th className="pb-2 pr-3 font-semibold">Due</th>
                        <th className="pb-2 text-right font-semibold">Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {overdueBooks.slice(0, 8).map((b) => (
                        <tr key={b.id} className="text-gray-700">
                          <td className="py-2 pr-3">
                            <p className="font-medium text-gray-900 line-clamp-1">{b.title}</p>
                            <p className="text-xs text-gray-500">{b.barcode}</p>
                          </td>
                          <td className="py-2 pr-3">{b.member}</td>
                          <td className="py-2 pr-3">{formatShortDate(b.dueDate)}</td>
                          <td className="py-2 text-right">
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                              {b.daysOverdue}d
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: 'blue' | 'green' | 'indigo' | 'red' | 'purple' | 'amber';
  href?: string;
}) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
  };

  const inner = (
    <div className={`rounded-xl border p-3 ${tones[tone]} ${href ? 'hover:opacity-90 transition-opacity' : ''}`}>
      <p className="text-[11px] font-medium opacity-80">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

function QuickAction({
  href,
  icon: Icon,
  label,
  primary,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
        primary
          ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700'
          : 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
      }`}
    >
      <Icon size={14} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <Icon className="text-primary-600" size={15} />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div
      className="flex items-center justify-center text-sm text-gray-400"
      style={{ height: CHART_HEIGHT }}
    >
      No data
    </div>
  );
}
