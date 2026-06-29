'use client';

import React, { useState, useEffect } from 'react';
import { FiTruck, FiMapPin, FiUsers, FiDollarSign, FiDownload } from 'react-icons/fi';
import { Button } from '@edulakhya/ui';
import { formatCurrency, formatDate } from '@edulakhya/utils';

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/transport/stats');
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

  const handleExport = (reportType: string) => {
    alert(`Exporting ${reportType} report... (Feature to be implemented)`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {loading ? (
        <div className="text-center py-8">Loading reports...</div>
      ) : stats ? (
        <>
          {/* Report Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <FiTruck className="text-blue-600 text-2xl" />
                <Button size="sm" variant="outline" onClick={() => handleExport('vehicles')}>
                  <FiDownload className="mr-2" />
                  Export
                </Button>
              </div>
              <h3 className="text-sm font-medium text-gray-600">Vehicles Report</h3>
              <p className="text-xl text-gray-900 mt-2">{stats.total_vehicles}</p>
              <p className="text-sm text-gray-500 mt-1">Total vehicles</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <FiMapPin className="text-green-600 text-2xl" />
                <Button size="sm" variant="outline" onClick={() => handleExport('routes')}>
                  <FiDownload className="mr-2" />
                  Export
                </Button>
              </div>
              <h3 className="text-sm font-medium text-gray-600">Routes Report</h3>
              <p className="text-xl text-gray-900 mt-2">{stats.active_routes}</p>
              <p className="text-sm text-gray-500 mt-1">Active routes</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <FiUsers className="text-purple-600 text-2xl" />
                <Button size="sm" variant="outline" onClick={() => handleExport('students')}>
                  <FiDownload className="mr-2" />
                  Export
                </Button>
              </div>
              <h3 className="text-sm font-medium text-gray-600">Students Report</h3>
              <p className="text-xl text-gray-900 mt-2">{stats.students_using_transport}</p>
              <p className="text-sm text-gray-500 mt-1">Using transport</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <FiDollarSign className="text-yellow-600 text-2xl" />
                <Button size="sm" variant="outline" onClick={() => handleExport('revenue')}>
                  <FiDownload className="mr-2" />
                  Export
                </Button>
              </div>
              <h3 className="text-sm font-medium text-gray-600">Revenue Report</h3>
              <p className="text-xl text-gray-900 mt-2">{formatCurrency(stats.monthly_transport_fee)}</p>
              <p className="text-sm text-gray-500 mt-1">Monthly revenue</p>
            </div>
          </div>

          {/* Detailed Reports */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Maintenance Report */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Maintenance Report</h2>
                  <Button size="sm" variant="outline" onClick={() => handleExport('maintenance')}>
                    <FiDownload className="mr-2" />
                    Export
                  </Button>
                </div>
              </div>
              <div className="p-6">
                {stats.maintenance_needed && stats.maintenance_needed.length > 0 ? (
                  <div className="space-y-3">
                    {stats.maintenance_needed.map((vehicle: any) => (
                      <div key={vehicle.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900">{vehicle.vehicle_number}</p>
                          <p className="text-sm text-gray-500 capitalize">{vehicle.vehicle_type}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Needs Attention
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">All vehicles are up to date</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Quick Statistics</h2>
                  <Button size="sm" variant="outline" onClick={() => handleExport('summary')}>
                    <FiDownload className="mr-2" />
                    Export
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Total Vehicles</span>
                    <span className="font-medium text-gray-900">{stats.total_vehicles}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Active Routes</span>
                    <span className="font-medium text-gray-900">{stats.active_routes}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Students Using Transport</span>
                    <span className="font-medium text-gray-900">{stats.students_using_transport}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Monthly Transport Fee</span>
                    <span className="font-medium text-gray-900">{formatCurrency(stats.monthly_transport_fee)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 pt-4 border-t">
                    <span className="text-sm text-gray-600">Vehicles Needing Maintenance</span>
                    <span className="font-medium text-red-600">
                      {stats.maintenance_needed ? stats.maintenance_needed.length : 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Export All */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-900">Export All Reports</h3>
                <p className="text-sm text-blue-700 mt-1">Download a comprehensive report with all transport data</p>
              </div>
              <Button onClick={() => handleExport('all')}>
                <FiDownload className="mr-2" />
                Export All Data
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">Failed to load reports</div>
      )}
    </div>
  );
}


























































