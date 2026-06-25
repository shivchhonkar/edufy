'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import {
  FiBook,
  FiLayers,
  FiCheckCircle,
  FiUser,
  FiClock,
  FiAlertCircle,
  FiPlus,
  FiPrinter,
  FiUpload,
} from 'react-icons/fi';
import Link from 'next/link';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

function StatCard({ title, value, icon: Icon, link }: { title: string; value: string | number; icon?: any; link?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary-50 text-primary-700">
            {Icon ? <Icon className="w-5 h-5" /> : <FiBook className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-xs text-gray-500">{title}</div>
            <div className="text-2xl font-semibold text-gray-900">{value}</div>
          </div>
        </div>
      </div>
      {link && (
        <Link href={link} className="text-xs text-primary-600 mt-2 inline-block hover:underline">
          View all
        </Link>
      )}
    </div>
  );
}

export default function LibraryDashboardPage() {
  const { alert } = useDialog();
  const [metrics, setMetrics] = useState({
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

  const [issuedVsReturned, setIssuedVsReturned] = useState<Array<{ name: string; value: number }>>([]);
  const [recentTransactions, setRecentTransactions] = useState<Array<{ id: number; member: string; book: string; type: 'Issued' | 'Returned'; date: string }>>([]);
  const [overdueBooks, setOverdueBooks] = useState<Array<{ id: number; barcode: string; title: string; member: string; dueDate: string; daysOverdue: number }>>([]);
  const [topIssuedBooks, setTopIssuedBooks] = useState<Array<{ name: string; issued: number }>>([]);
  const [booksByCategory, setBooksByCategory] = useState<Array<{ name: string; count: number }>>([]);
  const [circulationTrend, setCirculationTrend] = useState<Array<{ date: string; Issued: number; Returned: number }>>([]);

  useEffect(() => {
    async function load() {
      try {
        const [metricsRes, issuesRes, membersRes, booksRes, categoriesRes] = await Promise.all([
          fetch('/api/library/metrics'),
          fetch('/api/library/issues'),
          fetch('/api/library/members'),
          fetch('/api/library/books'),
          fetch('/api/library/categories'),
        ]);

        const [metricsData, issuesData, membersData, booksData, categoriesData] = await Promise.all([
          metricsRes.json(),
          issuesRes.json(),
          membersRes.json(),
          booksRes.json(),
          categoriesRes.json(),
        ]);
        
        if (metricsData.success) setMetrics(metricsData.data);
        
        if (issuesData.success) {
          const issues = issuesData.data || [];
          
          // Calculate issued vs returned
          const issued = issues.filter((i: any) => i.status === 'issued').length;
          const returned = issues.filter((i: any) => i.status === 'returned').length;
          setIssuedVsReturned([
            { name: 'Issued', value: issued },
            { name: 'Returned', value: returned },
          ]);
          
          // Recent transactions (last 10)
          const recent = issues.slice(-10).map((i: any) => ({
            id: i.id,
            member: i.member?.name || 'Unknown',
            book: i.book?.title || 'Unknown',
            type: i.status === 'issued' ? 'Issued' : 'Returned',
            date: i.status === 'issued' ? i.issued_at : i.returned_at,
          })).reverse();
          setRecentTransactions(recent);
          
          // Overdue books
          const today = new Date();
          const overdue = issues
            .filter((i: any) => i.status === 'issued' && new Date(i.due_at) < today)
            .map((i: any) => {
              const daysOverdue = Math.floor((today.getTime() - new Date(i.due_at).getTime()) / (1000 * 60 * 60 * 24));
              return {
                id: i.id,
                barcode: i.copy?.barcode || 'N/A',
                title: i.book?.title || 'Unknown',
                member: i.member?.name || 'Unknown',
                dueDate: i.due_at,
                daysOverdue,
              };
            });
          setOverdueBooks(overdue);
          
          // Circulation trend by date (last 7 days)
          const trendMap: Record<string, { Issued: number; Returned: number }> = {};
          const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          issues.forEach((i: any) => {
            const dateStr = i.status === 'issued' ? i.issued_at : i.returned_at;
            const date = new Date(dateStr);
            if (date >= sevenDaysAgo && date <= today) {
              const key = date.toLocaleDateString('en-IN');
              if (!trendMap[key]) trendMap[key] = { Issued: 0, Returned: 0 };
              if (i.status === 'issued') trendMap[key].Issued++;
              else trendMap[key].Returned++;
            }
          });
          const trend = Object.entries(trendMap).map(([date, data]) => ({ date, ...data }));
          setCirculationTrend(trend);
        }
        
        if (booksData.success) {
          const books = booksData.data || [];
          // Top issued books (by copy count)
          const topBooks = books
            .map((b: any) => ({
              name: b.title.substring(0, 20),
              issued: (b.copies || []).filter((c: any) => c.status === 'issued').length,
            }))
            .sort((a: any, b: any) => b.issued - a.issued)
            .slice(0, 5);
          setTopIssuedBooks(topBooks);
        }
        
        if (categoriesData.success && booksData.success) {
          const categories = categoriesData.data || [];
          const books = booksData.data || [];
          // Books by category
          const categoryMap: Record<number, number> = {};
          categories.forEach((c: any) => {
            categoryMap[c.id] = books.filter((b: any) => b.category_id === c.id).length;
          });
          const byCat = categories
            .map((c: any) => ({ name: c.name, count: categoryMap[c.id] || 0 }))
            .filter((c: any) => c.count > 0);
          setBooksByCategory(byCat);
        }
      } catch (err) {
        console.error('Failed to load library data', err);
      }
    }
    load();
  }, []);

  const handleAction = (action: string) => {
    alert(`${action} action not implemented yet.`, { title: action });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>

        {/* Top Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Books" value={metrics.totalBooks} icon={FiBook} link="/library/catalog/books" />
          <StatCard title="Total Members" value={metrics.activeMembers} icon={FiUser} link="/library/members" />
          <StatCard title="Books Issued" value={metrics.issuedBooks} icon={FiUpload} link="/library/circulation/issue" />
          <StatCard title="Overdue Books" value={metrics.overdueBooks} icon={FiClock} link="/library/reports" />
        </div>

        {/* Issued vs Returned Chart + Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Issued vs Returned</h3>
            {issuedVsReturned.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={issuedVsReturned} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                    <Cell fill="#3B82F6" />
                    <Cell fill="#10B981" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No data</div>
            )}
            <div className="text-center mt-4">
              <div className="text-3xl font-bold text-gray-900">{issuedVsReturned.reduce((s, i) => s + i.value, 0)}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
              <Link href="/library/circulation" className="text-sm text-primary-600 hover:underline">
                View all
              </Link>
            </div>
            <ul className="space-y-3">
              {recentTransactions.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FiUser className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{t.member}</div>
                      <div className="text-xs text-gray-500 truncate">{t.book}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className={`text-xs px-2 py-1 rounded ${t.type === 'Issued' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {t.type}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(t.date).toLocaleDateString('en-IN')}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Top Issued Books + Books by Category */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Issued Books */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Issued Books</h3>
            {topIssuedBooks.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topIssuedBooks}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="issued" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No data</div>
            )}
          </div>

          {/* Books by Category */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Books by Category</h3>
            {booksByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={booksByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No data</div>
            )}
          </div>
        </div>

        {/* Circulation Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Circulation Trend (Last 7 Days)</h3>
          {circulationTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={circulationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Issued" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="Returned" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Overdue Books</h3>
            <Link href="/library/fines" className="text-sm text-primary-600 hover:underline">
              View all
            </Link>
          </div>
          {overdueBooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overdueBooks.map((b) => (
                <div key={b.id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded flex items-center justify-center flex-shrink-0">
                      <FiBook className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm line-clamp-2">{b.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{b.member}</div>
                      <div className="text-xs text-gray-600 mt-2">Due: {new Date(b.dueDate).toLocaleDateString('en-IN')}</div>
                      <div className="text-xs text-red-600 font-semibold mt-1">{b.daysOverdue} Days Overdue</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No overdue books</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
