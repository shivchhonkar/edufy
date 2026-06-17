'use client'

import { useEffect, useState } from 'react'
import {
  FiPackage,
  FiShoppingCart,
  FiTrendingDown,
  FiDollarSign,
  FiUsers,
  FiBarChart,
  FiTag,
} from 'react-icons/fi'
import {
  StatCard,
  PortalPageShell,
  PortalLoadingSpinner,
  PortalQuickActionCard,
} from '@edulakhya/ui'
import { formatCurrency } from '@edulakhya/utils'
import Link from 'next/link'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function InventoryAdmin() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setUserName(user.full_name || user.email || '')
      } catch {
        /* ignore */
      }
    }
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => data.success && setStats(data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <PortalPageShell
      greeting={userName ? `${getGreeting()}, ${userName.split(' ')[0]}` : getGreeting()}
      title="Inventory Dashboard"
      subtitle="Manage stock, sales, and inventory transactions"
    >
      {loading ? (
        <PortalLoadingSpinner />
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Items" value={stats.total_items.toString()} icon={FiPackage} color="blue" />
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

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <PortalQuickActionCard title="Inventory Items" description="Manage books, uniforms, and stationery" icon={FiPackage} href="/items" color="blue" />
              <PortalQuickActionCard title="Sell Items" description="Record sales to students" icon={FiShoppingCart} href="/sales" color="green" />
              <PortalQuickActionCard title="Stock Transactions" description="Manage purchase orders and stock" icon={FiDollarSign} href="/transactions" color="purple" />
              <PortalQuickActionCard title="Categories" description="Manage item categories" icon={FiTag} href="/categories" color="amber" />
              <PortalQuickActionCard title="Sales Reports" description="View sales analytics and reports" icon={FiBarChart} href="/reports" color="indigo" />
            </div>
          </section>

          {stats.low_stock_alerts?.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Low Stock Alerts</h2>
                <span className="text-sm text-slate-500">
                  {stats.low_stock_alerts.length} item(s) need restocking
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {stats.low_stock_alerts.map((item: any) => (
                    <LowStockItem key={item.id} item={item} />
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
  )
}

function LowStockItem({ item }: { item: any }) {
  const shortage = item.min_stock_level - item.quantity
  const estimatedCost = item.unit_price ? shortage * item.unit_price : 0

  return (
    <div className="p-4 flex items-center justify-between hover:bg-slate-50">
      <div>
        <h4 className="font-medium text-slate-900">{item.item_name}</h4>
        <p className="text-sm text-slate-600">
          Current: {item.quantity} | Minimum: {item.min_stock_level} | Shortage: {shortage}
        </p>
        {estimatedCost > 0 && (
          <p className="text-xs text-slate-500">Estimated restock cost: {formatCurrency(estimatedCost)}</p>
        )}
      </div>
      <Link href="/transactions" className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700">
        Restock
      </Link>
    </div>
  )
}
