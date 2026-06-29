'use client';

import { useState, useEffect } from 'react';
import { FiTruck, FiMapPin, FiUsers, FiDollarSign, FiAlertCircle } from 'react-icons/fi';
import { StatCard, PortalPageShell, PortalLoadingSpinner } from '@edulakhya/ui';
import { formatCurrency, formatDate } from '@edulakhya/utils';
import Link from 'next/link';
import { transportApi, transportRoute } from '@/lib/transport-portal/constants';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TransportDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserName(user.full_name || user.email || '');
      } catch {
        /* ignore */
      }
    }
    fetch(transportApi('/stats'))
      .then((r) => r.json())
      .then((data) => data.success && setStats(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalPageShell
      greeting={userName ? `${getGreeting()}, ${userName.split(' ')[0]}` : getGreeting()}
      title="Transport Dashboard"
      subtitle="Manage vehicles, routes, drivers, and student transport"
    >
      {loading ? (
        <PortalLoadingSpinner />
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Vehicles" value={stats.total_vehicles.toString()} icon={FiTruck} color="blue" />
            <StatCard title="Active Routes" value={stats.active_routes.toString()} icon={FiMapPin} color="green" />
            <StatCard
              title="Students Using Transport"
              value={stats.students_using_transport.toString()}
              icon={FiUsers}
              color="purple"
            />
            <StatCard
              title="Monthly Transport Fee"
              value={formatCurrency(stats.monthly_transport_fee)}
              icon={FiDollarSign}
              color="yellow"
            />
          </div>

          {stats.maintenance_needed?.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Maintenance Alerts</h2>
                <span className="text-sm text-slate-500">
                  {stats.maintenance_needed.length} vehicle(s) need attention
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {stats.maintenance_needed.map((vehicle: any) => (
                    <MaintenanceAlert key={vehicle.id} vehicle={vehicle} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-slate-500">Failed to load dashboard data</div>
      )}
    </PortalPageShell>
  );
}

function MaintenanceAlert({ vehicle }: { vehicle: Record<string, string | undefined> }) {
  const getExpiringItem = () => {
    const items: string[] = [];
    const check = (label: string, dateStr?: string) => {
      if (!dateStr) return;
      const date = new Date(dateStr);
      if (date < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
        items.push(`${label}: ${formatDate(date)}`);
      }
    };
    check('Insurance', vehicle.insurance_expiry);
    check('Pollution Cert', vehicle.pollution_certificate_expiry);
    check('Fitness Cert', vehicle.fitness_certificate_expiry);
    return items.join(', ');
  };

  return (
    <div className="p-4 flex items-center justify-between hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <FiAlertCircle className="text-red-600 shrink-0" size={20} />
        <div>
          <h4 className="font-medium text-slate-900">{vehicle.vehicle_number}</h4>
          <p className="text-sm text-slate-600">
            {vehicle.vehicle_type} — {getExpiringItem()}
          </p>
        </div>
      </div>
      <Link
        href={transportRoute('/vehicles')}
        className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700"
      >
        Update
      </Link>
    </div>
  );
}
