'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiChevronDown,
  FiInfo,
  FiMapPin,
  FiPlus,
  FiRefreshCw,
  FiTruck,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { PortalLoadingSpinner } from '@edulakhya/ui';
import { formatCurrency, formatDate } from '@edulakhya/utils';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import { transportApi, transportRoute } from '@/lib/transport-portal/constants';

interface DashboardStats {
  vehicles: { total: number; active: number; inactive: number };
  drivers: { total: number; active: number; inactive: number };
  routes: { total: number; active: number; inactive: number; running: number };
  students: {
    total: number;
    active: number;
    active_routes: number;
    total_stops: number;
  };
  monthly_transport_fee: number;
  utilization: { percent: number; in_use: number; idle: number; total: number };
  attendance_today: {
    present: number;
    absent: number;
    yet_to_board: number;
    cancelled: number;
    total: number;
    present_percent: number;
    absent_percent: number;
    yet_to_board_percent: number;
    cancelled_percent: number;
  };
  upcoming_trips: Array<{
    id: number;
    label: string;
    path: string;
    trip_time: string | null;
  }>;
  today_trips: Array<{
    id: number;
    route_label: string;
    driver_name: string;
    vehicle_number: string;
    trip: string;
    status: string;
    student_count: number;
  }>;
  fee_collection: {
    total_due: number;
    collected: number;
    pending: number;
    overdue: number;
    overdue_students_count: number;
    collected_percent: number;
    pending_percent: number;
    overdue_percent: number;
  };
  overdue_students: Array<{
    student_id: number;
    name: string;
    route_name: string;
    due_amount: number;
    due_date: string;
  }>;
  maintenance_needed: Array<Record<string, string | undefined>>;
  last_updated: string;
}

function formatTripTime(value: string | null | undefined) {
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

function tripStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return { label: 'Completed', className: 'bg-green-100 text-green-800' };
    case 'on_time':
      return { label: 'On Time', className: 'bg-green-100 text-green-800' };
    case 'delayed':
      return { label: 'Delayed', className: 'bg-orange-100 text-orange-800' };
    default:
      return { label: 'Not Started', className: 'bg-red-100 text-red-800' };
  }
}

export default function TransportDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickOpen, setQuickOpen] = useState(false);

  const loadStats = () => {
    setLoading(true);
    fetch(transportApi('/stats'))
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, []);

  const lastUpdatedLabel = useMemo(() => {
    if (!stats?.last_updated) return '';
    return new Date(stats.last_updated).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [stats?.last_updated]);

  if (loading) {
    return (
      <div className="p-6">
        <PortalLoadingSpinner />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-500">
        Failed to load dashboard data.{' '}
        <button type="button" onClick={loadStats} className="text-primary-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const fee = stats.fee_collection;
  const barCollected = fee.collected_percent;
  const barPending = fee.pending_percent;
  const barOverdue = fee.overdue_percent;

  return (
    <div className="space-y-6 p-4 sm:p-4 lg:p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Dashboard</h1>
          {/* <p className="text-xs text-gray-600 mt-1">Overview of your transport operations</p> */}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setQuickOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Quick Actions
              <FiChevronDown size={14} />
            </button>
            {quickOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Close menu"
                  onClick={() => setQuickOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-sm">
                  <Link href={transportRoute('/vehicles')} className="block px-3 py-2 hover:bg-gray-50" onClick={() => setQuickOpen(false)}>
                    Add Vehicle
                  </Link>
                  <Link href={transportRoute('/routes')} className="block px-3 py-2 hover:bg-gray-50" onClick={() => setQuickOpen(false)}>
                    Add Route
                  </Link>
                  <Link href={transportRoute('/route-assignments')} className="block px-3 py-2 hover:bg-gray-50" onClick={() => setQuickOpen(false)}>
                    Assign Students
                  </Link>
                  <Link href={transportRoute('/students')} className="block px-3 py-2 hover:bg-gray-50" onClick={() => setQuickOpen(false)}>
                    View Students
                  </Link>
                </div>
              </>
            )}
          </div>
          <Link
            href={transportRoute('/route-assignments')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <FiPlus size={16} />
            Add
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryStatCard
          title="Total Vehicles"
          value={stats.vehicles.total}
          footer={`${stats.vehicles.active} Active • ${stats.vehicles.inactive} Inactive`}
          icon={<FiTruck className="text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <SummaryStatCard
          title="Total Drivers"
          value={stats.drivers.total}
          footer={`${stats.drivers.active} Active • ${stats.drivers.inactive} Inactive`}
          icon={<FiUser className="text-green-600" />}
          iconBg="bg-green-50"
        />
        <SummaryStatCard
          title="Active Routes"
          value={stats.routes.active}
          footer={`${stats.routes.running} Running • ${stats.routes.inactive} Inactive`}
          icon={<FiMapPin className="text-purple-600" />}
          iconBg="bg-purple-50"
        />
        <SummaryStatCard
          title="Students Using Transport"
          value={stats.students.active}
          footer={`${stats.students.active_routes} Routes • ${stats.students.total_stops} Stops`}
          icon={<FiUsers className="text-orange-600" />}
          iconBg="bg-orange-50"
        />
        {/* <SummaryStatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthly_transport_fee)}
          footer="This Month"
          icon={<RupeeIcon size={18} className="text-yellow-600" />}
          iconBg="bg-yellow-50"
        /> */}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <PanelCard
          title="Transport Utilization"
          action={<span className="text-xs text-gray-500">This Month</span>}
        >
          <div className="flex flex-col items-center py-4">
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3"
                  strokeDasharray={`${stats.utilization.percent} ${100 - stats.utilization.percent}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{stats.utilization.percent}%</span>
                <span className="text-xs text-gray-500">Utilized</span>
              </div>
            </div>
            <div className="mt-4 space-y-2 w-full text-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-gray-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  In Use
                </span>
                <span className="text-gray-900 font-medium">
                  {stats.utilization.in_use} Vehicles ({stats.utilization.percent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-gray-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                  Not In Use
                </span>
                <span className="text-gray-900 font-medium">
                  {stats.utilization.idle} Vehicles ({100 - stats.utilization.percent}%)
                </span>
              </div>
            </div>
          </div>
        </PanelCard>

        <PanelCard title="Attendance Overview (Today)">
          <div className="grid grid-cols-2 gap-3">
            <AttendanceBox
              label="Present"
              value={stats.attendance_today.present}
              percent={stats.attendance_today.present_percent}
              className="bg-green-50 border-green-100 text-green-800"
            />
            <AttendanceBox
              label="Absent"
              value={stats.attendance_today.absent}
              percent={stats.attendance_today.absent_percent}
              className="bg-red-50 border-red-100 text-red-800"
            />
            <AttendanceBox
              label="Yet to Board"
              value={stats.attendance_today.yet_to_board}
              percent={stats.attendance_today.yet_to_board_percent}
              className="bg-orange-50 border-orange-100 text-orange-800"
            />
            <AttendanceBox
              label="Cancelled"
              value={stats.attendance_today.cancelled}
              percent={stats.attendance_today.cancelled_percent}
              className="bg-blue-50 border-blue-100 text-blue-800"
            />
          </div>
        </PanelCard>

        <PanelCard
          title="Upcoming Trips"
          action={
            <Link href={transportRoute('/routes')} className="text-sm text-primary-600 hover:text-primary-700">
              View All
            </Link>
          }
        >
          <div className="space-y-3">
            {stats.upcoming_trips.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No upcoming trips scheduled</p>
            ) : (
              stats.upcoming_trips.map((trip) => (
                <div key={trip.id} className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FiTruck className="text-blue-600" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{trip.label}</p>
                    <p className="text-xs text-gray-500 truncate">{trip.path || '—'}</p>
                  </div>
                  <span className="text-xs font-medium text-gray-700 shrink-0">
                    {formatTripTime(trip.trip_time)}
                  </span>
                </div>
              ))
            )}
          </div>
        </PanelCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="xl:col-span-2">
          <PanelCard
            title="Today's Trips Status"
            action={
              <Link href={transportRoute('/current-assignments')} className="text-sm text-primary-600 hover:text-primary-700">
                View All
              </Link>
            }
          >
            <div className="overflow-x-auto -mx-4 sm:-mx-5">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2 text-left font-semibold">Route</th>
                    <th className="px-4 py-2 text-left font-semibold">Driver</th>
                    <th className="px-4 py-2 text-left font-semibold">Vehicle</th>
                    <th className="px-4 py-2 text-left font-semibold">Trip</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-right font-semibold">Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.today_trips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No active routes found
                      </td>
                    </tr>
                  ) : (
                    stats.today_trips.map((trip) => {
                      const badge = tripStatusBadge(trip.status);
                      return (
                        <tr key={trip.id} className="hover:bg-gray-50/80">
                          <td className="px-4 py-3 font-medium text-gray-900">{trip.route_label}</td>
                          <td className="px-4 py-3 text-gray-700">{trip.driver_name}</td>
                          <td className="px-4 py-3 text-gray-700">{trip.vehicle_number}</td>
                          <td className="px-4 py-3 text-gray-700">{trip.trip}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">{trip.student_count}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </PanelCard>
        </div>

        {/* <PanelCard
          title="Fee Collection Overview (This Month)"
          action={
            <Link href={transportRoute('/reports')} className="text-sm text-primary-600 hover:text-primary-700">
              View Report
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <FeeLine label="Collected" amount={fee.collected} percent={fee.collected_percent} color="text-green-700" />
              <FeeLine label="Pending" amount={fee.pending} percent={fee.pending_percent} color="text-orange-700" />
              <FeeLine
                label="Overdue"
                amount={fee.overdue}
                percent={fee.overdue_percent}
                color="text-red-700"
                sub={`${fee.overdue_students_count} Students`}
              />
            </div>

            <div className="h-2 rounded-full overflow-hidden flex bg-gray-100">
              <div className="bg-green-500" style={{ width: `${barCollected}%` }} />
              <div className="bg-orange-400" style={{ width: `${barPending}%` }} />
              <div className="bg-red-500" style={{ width: `${barOverdue}%` }} />
            </div>

            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">Recent Overdue Students</h4>
                <Link href={transportRoute('/students')} className="text-xs text-primary-600 hover:text-primary-700">
                  View All
                </Link>
              </div>
              {stats.overdue_students.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No overdue transport fees</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 uppercase">
                        <th className="py-2 text-left font-semibold">Student</th>
                        <th className="py-2 text-left font-semibold">Route</th>
                        <th className="py-2 text-right font-semibold">Due</th>
                        <th className="py-2 text-right font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.overdue_students.map((row) => (
                        <tr key={`${row.student_id}-${row.due_date}`}>
                          <td className="py-2 pr-2">
                            <Link
                              href={transportRoute(`/students/${row.student_id}`)}
                              className="text-gray-900 hover:text-primary-600 font-medium"
                            >
                              {row.name}
                            </Link>
                          </td>
                          <td className="py-2 pr-2 text-gray-600">{row.route_name}</td>
                          <td className="py-2 text-right text-red-700 font-medium">
                            {formatCurrency(row.due_amount)}
                          </td>
                          <td className="py-2 text-right text-gray-600">
                            {row.due_date ? formatDate(new Date(row.due_date)) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </PanelCard> */}
      </div>

      {stats.maintenance_needed.length > 0 && (
        <PanelCard title="Maintenance Alerts">
          <div className="divide-y divide-gray-100">
            {stats.maintenance_needed.map((vehicle) => (
              <div key={vehicle.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FiAlertCircle className="text-red-600 shrink-0" size={18} />
                  <div>
                    <p className="font-medium text-gray-900">{vehicle.vehicle_number}</p>
                    <p className="text-xs text-gray-500 capitalize">{vehicle.vehicle_type}</p>
                  </div>
                </div>
                <Link
                  href={transportRoute('/vehicles')}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Update
                </Link>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-start gap-3 text-sm text-blue-900">
        <FiInfo className="shrink-0 mt-0.5" size={16} />
        <p>Keep your transport data updated for smooth operations and accurate reporting.</p>
        <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
        <button
          type="button"
          onClick={loadStats}
          className="inline-flex items-center gap-1 hover:text-gray-700"
        >
          <FiRefreshCw size={12} />
          Refresh
        </button>
        {lastUpdatedLabel && <span>Last updated: {lastUpdatedLabel}</span>}
      </div>
      </div>      
    </div>
  );
}

function SummaryStatCard({
  title,
  value,
  footer,
  icon,
  iconBg,
}: {
  title: string;
  value: string | number;
  footer: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className="text-2xl text-gray-900 mt-1 truncate">{value}</p>
          <p className="text-xs text-gray-500 mt-2">{footer}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function PanelCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm text-gray-900">{title}</h3>
        {action}
      </div>
      <div className="px-4 sm:px-5 py-4">{children}</div>
    </div>
  );
}

function AttendanceBox({
  label,
  value,
  percent,
  className,
}: {
  label: string;
  value: number;
  percent: number;
  className: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <p className="text-2xl">{value}</p>
      <p className="text-xs font-medium mt-1">{label}</p>
      <p className="text-xs opacity-80 mt-0.5">{percent}%</p>
    </div>
  );
}

function FeeLine({
  label,
  amount,
  percent,
  color,
  sub,
}: {
  label: string;
  amount: number;
  percent: number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
      <div className="text-right">
        <p className={`font-semibold ${color}`}>{formatCurrency(amount)}</p>
        <p className="text-xs text-gray-500">{percent}%</p>
      </div>
    </div>
  );
}
