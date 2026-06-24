'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiTruck, FiMap, FiUsers, FiUser } from 'react-icons/fi';
import { Vehicle } from '@/shared/types';
import TransportPageHeader from '@/features/transport/components/TransportPageHeader';

export default function TransportDashboardView() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [vehiclesRes, routesRes, assignmentsRes] = await Promise.all([
          fetch('/api/transport/vehicles'),
          fetch('/api/transport/routes'),
          fetch('/api/transport/assignments?status=active'),
        ]);

        const [vehiclesData, routesData, assignmentsData] = await Promise.all([
          vehiclesRes.json(),
          routesRes.json(),
          assignmentsRes.json(),
        ]);

        if (vehiclesData.success) setVehicles(vehiclesData.data);
        if (routesData.success) setRoutes(routesData.data);
        if (assignmentsData.success) setAssignments(assignmentsData.data);
      } catch (error) {
        console.error('Error fetching transport dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeVehicles = vehicles.filter((v) => v.status === 'active').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'maintenance').length;
  const activeRoutes = routes.filter((r) => r.status === 'active').length;
  const activeStudentAssignments = assignments.filter((a) => a.status === 'active').length;

  const quickLinks = [
    {
      href: '/transport/vehicles',
      icon: FiTruck,
      label: 'Vehicles',
      description: 'Manage buses, vans, and fleet details',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      href: '/transport/routes',
      icon: FiMap,
      label: 'Routes & Stops',
      description: 'Create routes and assign vehicles',
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200',
    },
    {
      href: '/transport/route-assignments',
      icon: FiUsers,
      label: 'Route Assignments',
      description: 'Assign students to routes and stops',
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200',
    },
    {
      href: '/transport/driver-management',
      icon: FiUser,
      label: 'Driver Management',
      description: 'View and update driver details',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
    },
  ];

  return (
    <div className="space-y-6">
      <TransportPageHeader
        title="Transport Dashboard"
        description="Overview of fleet, routes, and student transport assignments"
        showSetupHint
      />

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Active Vehicles</p>
                  <p className="text-xl text-blue-700 mt-1">{activeVehicles}</p>
                </div>
                <FiTruck className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Maintenance</p>
                  <p className="text-xl text-yellow-700 mt-1">{maintenanceVehicles}</p>
                </div>
                <FiTruck className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active Routes</p>
                  <p className="text-xl text-green-700 mt-1">{activeRoutes}</p>
                </div>
                <FiMap className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Students on Transport</p>
                  <p className="text-xl text-purple-700 mt-1">{activeStudentAssignments}</p>
                </div>
                <FiUsers className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg border p-5 shadow-sm hover:shadow-md transition-shadow ${link.bg}`}
              >
                <link.icon className={`w-6 h-6 ${link.color} mb-2`} />
                <h3 className="font-semibold text-gray-900">{link.label}</h3>
                <p className="text-sm text-gray-600 mt-1">{link.description}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
