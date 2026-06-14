'use client';

import React, { useEffect, useState } from 'react';
import { FiPackage, FiShoppingCart, FiTrendingDown, FiDollarSign, FiUsers, FiBarChart, FiTag } from 'react-icons/fi';
import { StatCard } from '@EduLakhya/ui';
import { formatCurrency } from '@EduLakhya/utils';
import Link from 'next/link';

export default function InventoryAdmin() {
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-xl text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Inventory Management Overview</p>
        </div>
        {/* Stats */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                title="Total Items" 
                value={stats.total_items.toString()} 
                icon={FiPackage} 
                color="blue" 
              />
              <StatCard 
                title="Low Stock Items" 
                value={stats.low_stock_count.toString()} 
                icon={FiTrendingDown} 
                color="red" 
              />
              <StatCard 
                title="Sales This Month" 
                value={formatCurrency(stats.sales_this_month)} 
                icon={FiDollarSign} 
                color="green"
              />
              <StatCard 
                title="Students Served" 
                value={stats.students_served.toString()} 
                icon={FiUsers} 
                color="purple" 
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Link href="/items">
                <NavCard 
                  title="Inventory Items" 
                  description="Manage books, uniforms, and stationery" 
                  icon={FiPackage}
                />
              </Link>
              <Link href="/sales">
                <NavCard 
                  title="Sell Items" 
                  description="Record sales to students" 
                  icon={FiShoppingCart}
                />
              </Link>
              <Link href="/transactions">
                <NavCard 
                  title="Stock Transactions" 
                  description="Manage purchase orders and stock" 
                  icon={FiDollarSign}
                />
              </Link>
              <Link href="/categories">
                <NavCard 
                  title="Categories" 
                  description="Manage item categories" 
                  icon={FiTag}
                />
              </Link>
              <Link href="/reports">
                <NavCard 
                  title="Sales Reports" 
                  description="View sales analytics and reports" 
                  icon={FiBarChart}
                />
              </Link>
            </div>

            {/* Low Stock Alerts */}
            {stats.low_stock_alerts && stats.low_stock_alerts.length > 0 && (
              <section className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl text-gray-900">Low Stock Alerts</h2>
                  <span className="text-sm text-gray-500">
                    {stats.low_stock_alerts.length} item(s) need restocking
                  </span>
                </div>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="divide-y">
                    {stats.low_stock_alerts.map((item: any) => (
                      <LowStockItem 
                        key={item.id}
                        id={item.id}
                        name={item.item_name} 
                        current={item.quantity} 
                        minimum={item.min_stock_level}
                        unitPrice={item.unit_price}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">Failed to load stats</div>
        )}
      </div>
    </div>
  );
}

function NavCard({ title, description, icon: Icon }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
      <Icon className="w-10 h-10 text-indigo-600 mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function LowStockItem({ id, name, current, minimum, unitPrice }: any) {
  const shortage = minimum - current;
  const estimatedCost = unitPrice ? shortage * unitPrice : 0;

  return (
    <div className="p-4 flex items-center justify-between hover:bg-gray-50">
      <div>
        <h4 className="font-medium text-gray-900">{name}</h4>
        <p className="text-sm text-gray-600">
          Current: {current} | Minimum: {minimum} | Shortage: {shortage}
        </p>
        {estimatedCost > 0 && (
          <p className="text-xs text-gray-500">
            Estimated restock cost: {formatCurrency(estimatedCost)}
          </p>
        )}
      </div>
      <Link href="/transactions">
        <button className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
          Restock
        </button>
      </Link>
    </div>
  );
}

