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
import { useSettings } from '@/shared/SettingsContext'
import { useFeesStats } from '@/features/fees/hooks/useFeesStats'
import { formatFeeCurrency } from '@/features/fees/utils/fees-format'
import RupeeIcon from '@/components/icons/RupeeIcon'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function FeesDashboard() {
  const [userName, setUserName] = useState('')
  const { settings } = useSettings()
  const { stats, loading } = useFeesStats(settings.academic_year)

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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 min-w-0">
        <StatCard
          title="Collected This Month"
          value={loading ? '...' : formatFeeCurrency(stats?.this_month || 0)}
          icon={RupeeIcon}
          color="green"
        />
        <StatCard
          title="Pending Fees"
          value={loading ? '...' : formatFeeCurrency(stats?.total_pending || 0)}
          icon={FiCreditCard}
          color="red"
        />
        <StatCard
          title="Students with Dues"
          value={loading ? '...' : String(stats?.pending_students_count || 0)}
          icon={FiUsers}
          color="yellow"
        />
        <StatCard
          title="Total Collected"
          value={loading ? '...' : formatFeeCurrency(stats?.total_collected || 0)}
          icon={FiTrendingUp}
          color="blue"
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
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
