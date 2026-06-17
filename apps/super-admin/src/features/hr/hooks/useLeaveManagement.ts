'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LeaveBalance, LeaveRecord, LeaveStats, LeaveType, StaffOption } from '@/features/hr/types/leave'

export function useLeaveManagement(statusFilter: string) {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [approvedLeaves, setApprovedLeaves] = useState<LeaveRecord[]>([])
  const [stats, setStats] = useState<LeaveStats>({ total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 })
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const statusParam = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
    const [leavesRes, statsRes, typesRes, staffRes, approvedRes] = await Promise.all([
      fetch(`/api/leaves${statusParam}`, { cache: 'no-store' }),
      fetch('/api/leaves?stats=true', { cache: 'no-store' }),
      fetch('/api/leave-types', { cache: 'no-store' }),
      fetch('/api/staff?limit=200&status=active', { cache: 'no-store' }),
      fetch('/api/leaves?status=approved', { cache: 'no-store' }),
    ])
    const [leavesData, statsData, typesData, staffData, approvedData] = await Promise.all([
      leavesRes.json(),
      statsRes.json(),
      typesRes.json(),
      staffRes.json(),
      approvedRes.json(),
    ])
    if (leavesData.success) setLeaves(leavesData.data)
    if (approvedData.success) setApprovedLeaves(approvedData.data)
    if (statsData.success) setStats(statsData.data)
    if (typesData.success) setLeaveTypes(typesData.data)
    if (staffData.success) setStaff(staffData.data)
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchStaffBalances = useCallback(async (staffId: number, year?: number) => {
    const y = year ?? new Date().getFullYear()
    const res = await fetch(`/api/leave-balances?staff_id=${staffId}&year=${y}`, { cache: 'no-store' })
    const data = await res.json()
    if (data.success) return data.data as LeaveBalance[]
    return []
  }, [])

  const runAction = useCallback(
    async (id: number, fn: () => Promise<Response>) => {
      setActionId(id)
      try {
        const res = await fn()
        const data = await res.json()
        if (data.success) {
          await fetchData()
          return { ok: true as const, data: data.data }
        }
        return { ok: false as const, error: data.error || 'Action failed' }
      } finally {
        setActionId(null)
      }
    },
    [fetchData],
  )

  return {
    leaves,
    approvedLeaves,
    stats,
    leaveTypes,
    staff,
    loading,
    actionId,
    refresh: fetchData,
    fetchStaffBalances,
    runAction,
  }
}
