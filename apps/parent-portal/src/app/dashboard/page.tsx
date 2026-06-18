'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ParentDashboardView, {
  type DashboardChild,
  type DashboardStats,
} from '@/features/dashboard/ParentDashboardView'
import { getAuthHeaders, studentFullName } from '@/lib/client-auth'

type PortalUser = {
  login?: string
  children: DashboardChild[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<PortalUser | null>(null)
  const [selectedChild, setSelectedChild] = useState<DashboardChild | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchChildStats = useCallback(async (studentId: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/stats?studentId=${studentId}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (data.success) setStats(data.data)
      else setStats(null)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const selectChild = useCallback(
    (children: DashboardChild[], preferredId?: string | null) => {
      if (!children.length) {
        setSelectedChild(null)
        return
      }

      let childToSelect = children[0]
      if (preferredId) {
        const savedChild = children.find((child) => child.id.toString() === preferredId)
        if (savedChild) childToSelect = savedChild
      }

      setSelectedChild(childToSelect)
      localStorage.setItem('selectedChildId', childToSelect.id.toString())
      fetchChildStats(childToSelect.id)
    },
    [fetchChildStats],
  )

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    let parsedUser: PortalUser
    try {
      parsedUser = JSON.parse(userData)
    } catch {
      router.push('/login')
      return
    }

    const savedChildId = localStorage.getItem('selectedChildId')

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { headers: getAuthHeaders() })
        const data = await response.json()

        if (response.status === 401) {
          router.push('/login')
          return
        }

        if (data.success && data.user?.children?.length) {
          const refreshedUser = {
            login: data.user.login ?? parsedUser.login,
            children: data.user.children as DashboardChild[],
          }
          setUser(refreshedUser)
          localStorage.setItem('user', JSON.stringify(refreshedUser))
          selectChild(refreshedUser.children, savedChildId)
          return
        }
      } catch (error) {
        console.error('Error refreshing parent session:', error)
      }

      setUser(parsedUser)
      if (parsedUser.children?.length) {
        selectChild(parsedUser.children, savedChildId)
      } else {
        setLoading(false)
      }
    }

    loadSession()
  }, [router, selectChild])

  const handleChildChange = (child: DashboardChild) => {
    setSelectedChild(child)
    localStorage.setItem('selectedChildId', child.id.toString())
    window.dispatchEvent(
      new CustomEvent('childSelected', { detail: { childId: child.id.toString() } }),
    )
    fetchChildStats(child.id)
  }

  if (!user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="portal-spinner animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" />
      </div>
    )
  }

  if (!selectedChild) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        No linked students found for this account.
      </div>
    )
  }

  const displayName =
    user.login && !/^\d+$/.test(String(user.login).replace(/\s/g, ''))
      ? user.login
      : studentFullName(selectedChild)

  return (
    <ParentDashboardView
      userName={displayName}
      children={user.children || []}
      selectedChild={selectedChild}
      stats={stats}
      loading={loading}
      onChildChange={handleChildChange}
    />
  )
}
