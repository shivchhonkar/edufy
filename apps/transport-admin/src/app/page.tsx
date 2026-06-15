'use client';

import React, { useState, useEffect } from 'react';
import { FiTruck, FiMapPin, FiUsers, FiDollarSign, FiAlertCircle } from 'react-icons/fi';
import { StatCard } from '@edulakhya/ui';
import { formatCurrency, formatDate } from '@edulakhya/utils';
import Link from 'next/link';

export default function TransportAdmin() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Stats */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Total Vehicles" 
              value={stats.total_vehicles.toString()} 
              icon={FiTruck} 
              color="blue" 
            />
            <StatCard 
              title="Active Routes" 
              value={stats.active_routes.toString()} 
              icon={FiMapPin} 
              color="green" 
            />
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

          {/* Maintenance Alerts */}
          {stats.maintenance_needed && stats.maintenance_needed.length > 0 && (
            <section className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl text-gray-900">Maintenance Alerts</h2>
                <span className="text-sm text-gray-500">
                  {stats.maintenance_needed.length} vehicle(s) need attention
                </span>
              </div>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="divide-y">
                  {stats.maintenance_needed.map((vehicle: any) => (
                    <MaintenanceAlert key={vehicle.id} vehicle={vehicle} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Quick Stats Cards */}
          <section className="mt-8">
            <h2 className="text-xl text-gray-900 mb-4">Quick Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Vehicles</p>
                    <p className="text-xl text-gray-900 mt-1">
                      {stats.total_vehicles}
                    </p>
                  </div>
                  <FiTruck className="text-blue-600 text-3xl" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Transport Routes</p>
                    <p className="text-xl text-gray-900 mt-1">
                      {stats.active_routes}
                    </p>
                  </div>
                  <FiMapPin className="text-green-600 text-3xl" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Students Transported</p>
                    <p className="text-xl text-gray-900 mt-1">
                      {stats.students_using_transport}
                    </p>
                  </div>
                  <FiUsers className="text-purple-600 text-3xl" />
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">Failed to load stats</div>
      )}
    </div>
  );
}

function MaintenanceAlert({ vehicle }: any) {
  const getExpiringItem = () => {
    const items = [];
    if (vehicle.insurance_expiry) {
      const date = new Date(vehicle.insurance_expiry);
      if (date < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
        items.push(`Insurance: ${formatDate(date)}`);
      }
    }
    if (vehicle.pollution_certificate_expiry) {
      const date = new Date(vehicle.pollution_certificate_expiry);
      if (date < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
        items.push(`Pollution Cert: ${formatDate(date)}`);
      }
    }
    if (vehicle.fitness_certificate_expiry) {
      const date = new Date(vehicle.fitness_certificate_expiry);
      if (date < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
        items.push(`Fitness Cert: ${formatDate(date)}`);
      }
    }
    return items.join(', ');
  };

  return (
    <div className="p-4 flex items-center justify-between hover:bg-gray-50">
      <div className="flex items-center">
        <FiAlertCircle className="text-red-600 mr-3" size={20} />
        <div>
          <h4 className="font-medium text-gray-900">{vehicle.vehicle_number}</h4>
          <p className="text-sm text-gray-600">
            {vehicle.vehicle_type} - {getExpiringItem()}
          </p>
        </div>
      </div>
      <Link href="/vehicles">
        <button className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
          Update
        </button>
      </Link>
    </div>
  );
}

