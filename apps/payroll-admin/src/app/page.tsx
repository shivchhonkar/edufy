'use client'

import { useEffect, useState } from 'react'
import {
  FiUsers,
  FiCreditCard,
  FiTrendingUp,
  FiSettings,
  FiFileText,
} from 'react-icons/fi'
import {
  StatCard,
  PortalPageShell,
  PortalQuickActionCard,
} from '@edulakhya/ui'
import { formatCurrency } from '@edulakhya/utils'
import RupeeIcon from '@/components/icons/RupeeIcon'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function FeesDashboard() {
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
  }, [])

  return (
    <PortalPageShell
      greeting={userName ? `${getGreeting()}, ${userName.split(' ')[0]}` : getGreeting()}
      title="Fees Dashboard"
      subtitle="Collect fees, record payments, and print receipts"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Collected This Month" value={formatCurrency(125000)} icon={RupeeIcon} color="green" trend={{ value: '+15%', isPositive: true }} />
        <StatCard title="Pending Fees" value={formatCurrency(45000)} icon={FiCreditCard} color="red" />
        <StatCard title="Students with Dues" value="78" icon={FiUsers} color="yellow" />
        <StatCard title="Collection Rate" value="85%" icon={FiTrendingUp} color="blue" />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <PortalQuickActionCard title="Fee Structures" description="Create and manage fee structures by class" icon={FiSettings} href="/fee-structures" color="blue" />
          <PortalQuickActionCard title="Student Fees" description="View and manage individual student fees" icon={FiUsers} href="/student-fees" color="indigo" />
          <PortalQuickActionCard title="Record Payment" description="Record fee payments from students" icon={RupeeIcon} href="/payments" color="green" />
          <PortalQuickActionCard title="Generate Receipts" description="Create and print fee receipts" icon={FiFileText} href="/receipts" color="purple" />
          <PortalQuickActionCard title="Fee Reports" description="View collection reports and analytics" icon={FiTrendingUp} href="/reports" color="amber" />
          <PortalQuickActionCard title="Pending Collections" description="Track overdue and pending fees" icon={FiCreditCard} href="/pending" color="blue" />
        </div>
      </section>
    </PortalPageShell>
  )
}
