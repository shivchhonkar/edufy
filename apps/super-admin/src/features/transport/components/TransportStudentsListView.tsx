'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FiEye, FiMapPin, FiPhone, FiSearch, FiUser, FiUsers, FiX } from 'react-icons/fi';
import { formatCurrency, formatDate } from '@edulakhya/utils';
import TransportPageHeader from '@/features/transport/components/TransportPageHeader';

interface TransportStudentRow {
  id: number;
  student_id: number;
  route_id: number;
  stop_id: number | null;
  transport_fee: number | string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  photo_url?: string | null;
  parent_phone?: string | null;
  class_id?: number | null;
  class_name?: string | null;
  section_name?: string | null;
  route_name: string;
  route_number?: string | null;
  stop_name?: string | null;
  arrival_time?: string | null;
}

interface RouteOption {
  id: number;
  route_name: string;
}

interface ClassOption {
  id: number;
  name: string;
}

interface SectionOption {
  id: number;
  name: string;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-700';
    case 'suspended':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  const parts = String(value).split(':');
  if (parts.length < 2) return value;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (Number.isNaN(hours)) return value;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

export default function TransportStudentsListView() {
  const [students, setStudents] = useState<TransportStudentRow[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');

  useEffect(() => {
    fetch('/api/transport/routes')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRoutes(d.data);
      })
      .catch(() => {});

    fetch('/api/classes')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setClasses(d.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!filterClass) {
      setSections([]);
      setFilterSection('');
      return;
    }

    fetch(`/api/sections?class_id=${filterClass}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSections(d.data);
      })
      .catch(() => setSections([]));
    setFilterSection('');
  }, [filterClass]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (filterRoute) params.set('route_id', filterRoute);
        if (filterClass) params.set('class_id', filterClass);
        if (filterSection) params.set('section_id', filterSection);
        if (filterStatus) params.set('status', filterStatus);

        const query = params.toString();
        const url = query ? `/api/transport/assignments?${query}` : '/api/transport/assignments';
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) setStudents(data.data);
      } catch (error) {
        console.error('Error fetching transport students:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [search, filterRoute, filterClass, filterSection, filterStatus]);

  const stats = useMemo(() => {
    const active = students.filter((s) => s.status === 'active');
    const routeIds = new Set(active.map((s) => s.route_id));
    const monthlyRevenue = active.reduce(
      (sum, s) => sum + (parseFloat(String(s.transport_fee || 0)) || 0),
      0,
    );
    return {
      total: students.length,
      active: active.length,
      routes: routeIds.size,
      monthlyRevenue,
    };
  }, [students]);

  const hasActiveFilters =
    Boolean(search) || Boolean(filterRoute) || Boolean(filterClass) || Boolean(filterSection) || filterStatus !== 'active';

  const clearFilters = () => {
    setSearch('');
    setFilterRoute('');
    setFilterClass('');
    setFilterSection('');
    setFilterStatus('active');
  };

  return (
    <div className="space-y-6 p-4">
      <TransportPageHeader
        title="Transport Students"
        description="Students using school transport — route, pickup stop, fee, and parent contact"
        action={
          <Link
            href="/transport/route-assignments"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            Assign Transport
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Listed" value={stats.total} icon={<FiUsers className="text-blue-600" />} />
        <StatCard label="Active" value={stats.active} icon={<FiUser className="text-green-600" />} />
        <StatCard label="Routes Used" value={stats.routes} icon={<FiMapPin className="text-orange-600" />} />
        <StatCard
          label="Monthly Transport Fee"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={<span className="text-lg font-semibold text-yellow-600">₹</span>}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search name or admission no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Routes</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.route_name}
                </option>
              ))}
            </select>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              disabled={!filterClass}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">All Sections</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <FiX size={14} />
              Clear filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left font-semibold">Student</th>
                <th className="px-4 py-3 text-left font-semibold">Class</th>
                <th className="px-4 py-3 text-left font-semibold">Parent Contact</th>
                <th className="px-4 py-3 text-left font-semibold">Route</th>
                <th className="px-4 py-3 text-left font-semibold">Pickup Stop</th>
                <th className="px-4 py-3 text-left font-semibold">Pickup Time</th>
                <th className="px-4 py-3 text-right font-semibold">Fee / Month</th>
                <th className="px-4 py-3 text-left font-semibold">Start Date</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    {hasActiveFilters
                      ? 'No students match your filters'
                      : 'No students assigned to transport yet'}
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {student.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={student.photo_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-medium text-gray-600">
                              {student.first_name?.charAt(0)}
                              {student.last_name?.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/students/${student.student_id}`}
                            className="font-medium text-gray-900 hover:text-primary-600 truncate block"
                          >
                            {student.first_name} {student.last_name}
                          </Link>
                          <p className="text-xs text-gray-500">{student.admission_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{student.class_name || '—'}</p>
                      <p className="text-xs text-gray-500">
                        {student.section_name ? `Section ${student.section_name}` : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {student.parent_phone ? (
                        <span className="inline-flex items-center gap-1.5 text-gray-700">
                          <FiPhone size={13} className="text-gray-400 shrink-0" />
                          {student.parent_phone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-1.5">
                        <FiMapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">{student.route_name}</p>
                          {student.route_number && (
                            <p className="text-xs text-gray-500">{student.route_number}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{student.stop_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{formatTime(student.arrival_time)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {student.transport_fee
                        ? formatCurrency(parseFloat(String(student.transport_fee)))
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {student.start_date
                        ? formatDate(new Date(student.start_date))
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusBadgeClass(student.status)}`}
                      >
                        {student.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/transport/students/${student.student_id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg"
                      >
                        <FiEye size={14} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && students.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-sm text-gray-600">
            Showing {students.length} student{students.length === 1 ? '' : 's'}
            {filterStatus === 'active' && !hasActiveFilters ? ' (active transport)' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
    </div>
  );
}
