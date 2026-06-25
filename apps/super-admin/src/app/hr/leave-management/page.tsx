'use client'

import { useMemo, useState } from 'react'
import DashboardLayout from '@/shared/components/layout/DashboardLayout'
import HrNav from '@/features/hr/components/HrNav'
import LeaveApplyModal, { LeaveEditModal } from '@/features/hr/components/LeaveApplyModal'
import LeaveDetailModal from '@/features/hr/components/LeaveDetailModal'
import LeaveCalendarWidget from '@/features/hr/components/LeaveCalendarWidget'
import { useLeaveManagement } from '@/features/hr/hooks/useLeaveManagement'
import type { LeaveRecord } from '@/features/hr/types/leave'
import { useDialog } from '@/shared/context/DialogContext'
import { FiCheck, FiEdit2, FiEye, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi'

type DetailMode = 'view' | 'approve' | 'reject'

export default function LeaveManagementPage() {
  const { alert, confirm } = useDialog()
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [showApplyModal, setShowApplyModal] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null)
  const [detailMode, setDetailMode] = useState<DetailMode>('view')
  const [showEditModal, setShowEditModal] = useState(false)

  const { leaves, approvedLeaves, stats, leaveTypes, staff, loading, actionId, fetchStaffBalances, runAction, refresh } =
    useLeaveManagement(filter)

  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      const status = leave.status.toLowerCase()
      const employee = `${leave.first_name} ${leave.last_name}`.toLowerCase()
      const leaveType = (leave.leave_type_name || '').toLowerCase()
      const department = (leave.department_name || '').toLowerCase()
      const appliedOn = String(leave.created_at || '').slice(0, 10)

      if (search.trim()) {
        const q = search.toLowerCase()
        const employeeId = (leave.employee_id || '').toLowerCase()
        if (!employee.includes(q) && !employeeId.includes(q)) return false
      }
      if (departmentFilter && department !== departmentFilter.toLowerCase()) return false
      if (typeFilter && leaveType !== typeFilter.toLowerCase()) return false
      if (statusFilter && status !== statusFilter.toLowerCase()) return false
      if (fromDate && appliedOn < fromDate) return false
      if (toDate && appliedOn > toDate) return false

      return true
    })
  }, [leaves, search, departmentFilter, typeFilter, statusFilter, fromDate, toDate])

  const leaveBalanceSummary = useMemo(() => {
    const usedByType = new Map<string, number>()
    for (const leave of leaves) {
      if (leave.status !== 'approved') continue
      const key = leave.leave_type_name || 'Other'
      usedByType.set(key, (usedByType.get(key) || 0) + leave.days_requested)
    }
    return leaveTypes.map((type) => {
      const max = Number(type.max_days_per_year || 0)
      const used = usedByType.get(type.name) || 0
      return { name: type.name, used, total: max, remaining: Math.max(max - used, 0) }
    })
  }, [leaveTypes, leaves])

  const departments = useMemo(
    () =>
      Array.from(new Set(leaves.map((leave) => leave.department_name || 'Unassigned'))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [leaves],
  )

  const calendarLeaves = approvedLeaves

  const openDetail = (leave: LeaveRecord, mode: DetailMode = 'view') => {
    setSelectedLeave(leave)
    setDetailMode(mode)
  }

  const closeDetail = () => {
    setSelectedLeave(null)
    setDetailMode('view')
  }

  const handleApprove = async (remarks?: string) => {
    if (!selectedLeave) return
    if (detailMode === 'view') {
      setDetailMode('approve')
      return
    }
    const ok = await confirm(
      `Approve ${selectedLeave.days_requested} day(s) leave for ${selectedLeave.first_name} ${selectedLeave.last_name}?`,
      { title: 'Approve Leave', type: 'info', confirmText: 'Approve' },
    )
    if (!ok) return

    const result = await runAction(selectedLeave.id, () =>
      fetch(`/api/leaves/${selectedLeave.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', remarks: remarks?.trim() || null }),
      }),
    )
    if (result.ok) {
      await alert('Leave approved successfully', { title: 'Approved', type: 'success' })
      closeDetail()
    } else {
      await alert(result.error, { title: 'Error', type: 'error' })
    }
  }

  const handleReject = async (remarks: string) => {
    if (!selectedLeave) return
    if (detailMode === 'view') {
      setDetailMode('reject')
      return
    }
    if (!remarks.trim()) {
      await alert('Rejection reason is required', { title: 'Validation', type: 'warning' })
      return
    }

    const ok = await confirm('Reject this leave request?', { title: 'Reject Leave', type: 'danger', confirmText: 'Reject' })
    if (!ok) return

    const result = await runAction(selectedLeave.id, () =>
      fetch(`/api/leaves/${selectedLeave.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', remarks }),
      }),
    )
    if (result.ok) {
      await alert('Leave rejected', { title: 'Rejected', type: 'success' })
      closeDetail()
    } else {
      await alert(result.error, { title: 'Error', type: 'error' })
    }
  }

  const handleCancel = async () => {
    if (!selectedLeave) return
    const ok = await confirm(
      'Cancel this approved leave? Attendance records will be updated.',
      { title: 'Cancel Leave', type: 'warning', confirmText: 'Cancel Leave' },
    )
    if (!ok) return

    const result = await runAction(selectedLeave.id, () =>
      fetch(`/api/leaves/${selectedLeave.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      }),
    )
    if (result.ok) {
      await alert('Leave cancelled', { title: 'Cancelled', type: 'success' })
      closeDetail()
    } else {
      await alert(result.error, { title: 'Error', type: 'error' })
    }
  }

  const handleDelete = async (leave?: LeaveRecord) => {
    const target = leave || selectedLeave
    if (!target) return
    const ok = await confirm('Delete this pending leave request?', { title: 'Delete', type: 'danger', confirmText: 'Delete' })
    if (!ok) return

    const result = await runAction(target.id, () =>
      fetch(`/api/leaves/${target.id}`, { method: 'DELETE' }),
    )
    if (result.ok) {
      await alert('Leave request deleted', { title: 'Deleted', type: 'success' })
      closeDetail()
    } else {
      await alert(result.error, { title: 'Error', type: 'error' })
    }
  }

  const handleQuickAction = async (leave: LeaveRecord, act: 'approve' | 'reject') => {
    if (act === 'approve') {
      const ok = await confirm(
        `Approve leave for ${leave.first_name} ${leave.last_name}?`,
        { title: 'Approve Leave', confirmText: 'Approve' },
      )
      if (!ok) return
      const result = await runAction(leave.id, () =>
        fetch(`/api/leaves/${leave.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        }),
      )
      if (!result.ok) await alert(result.error, { title: 'Error', type: 'error' })
    } else {
      openDetail(leave, 'reject')
    }
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto min-w-0 w-full">
        <HrNav />
        <div className="flex flex-wrap justify-between items-end gap-3 mb-5">
          <div>
            <h1 className="text-2xl text-gray-900">Leave Management</h1>
            <p className="text-sm text-gray-600 mt-1">Manage and track staff leave requests</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['pending', 'approved', 'rejected', 'all'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowApplyModal(true)}
              className="flex items-center gap-1 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm"
            >
              <FiPlus /> Apply Leave
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <SummaryCard title="Total Requests" value={stats.total} tone="blue" />
          <SummaryCard title="Pending" value={stats.pending} tone="amber" />
          <SummaryCard title="Approved" value={stats.approved} tone="green" />
          <SummaryCard title="Rejected" value={stats.rejected} tone="red" />
        </div>

        <div className="space-y-4">
          <div className="bg-white border rounded-xl shadow-sm p-3">
              <div className="flex flex-col gap-3">
                <div className="relative w-full">
                  <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by employee name or ID..."
                    className="w-full pl-9 pr-2 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="border rounded-lg px-2 py-2 text-sm bg-white min-w-[140px] flex-1 sm:flex-none sm:w-40"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="border rounded-lg px-2 py-2 text-sm bg-white min-w-[120px] flex-1 sm:flex-none sm:w-36"
                  >
                    <option value="">All Types</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-lg px-2 py-2 text-sm bg-white min-w-[120px] flex-1 sm:flex-none sm:w-36"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <label className="flex items-center gap-2 min-w-[160px] flex-1 sm:flex-none">
                    <span className="text-xs text-gray-500 shrink-0 w-9">From</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="flex-1 min-w-0 border rounded-lg px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 min-w-[160px] flex-1 sm:flex-none">
                    <span className="text-xs text-gray-500 shrink-0 w-9">To</span>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(e) => setToDate(e.target.value)}
                      className="flex-1 min-w-0 border rounded-lg px-2 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>
            </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[980px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Employee</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Dates</th>
                    <th className="text-left px-4 py-3 font-medium">Days</th>
                    <th className="text-left px-4 py-3 font-medium">Reason</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Applied On</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                        No leave requests
                      </td>
                    </tr>
                  ) : (
                    filteredLeaves.map((l) => (
                      <tr key={l.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">
                            {l.first_name} {l.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{l.department_name || 'Unassigned'}</p>
                        </td>
                        <td className="px-4 py-3">{l.leave_type_name}</td>
                        <td className="px-4 py-3">
                          {String(l.start_date).split('T')[0]} – {String(l.end_date).split('T')[0]}
                        </td>
                        <td className="px-4 py-3">{l.days_requested}</td>
                        <td className="px-4 py-3 max-w-[160px] truncate" title={l.reason || ''}>
                          {l.reason || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${statusColor[l.status] || ''}`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {String(l.created_at).split('T')[0]}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openDetail(l)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                              title="View"
                            >
                              <FiEye />
                            </button>
                            {l.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  disabled={actionId === l.id}
                                  onClick={() => handleQuickAction(l, 'approve')}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                  title="Approve"
                                >
                                  <FiCheck />
                                </button>
                                <button
                                  type="button"
                                  disabled={actionId === l.id}
                                  onClick={() => handleQuickAction(l, 'reject')}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                  title="Reject"
                                >
                                  <FiX />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLeave(l)
                                    setShowEditModal(true)
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit"
                                >
                                  <FiEdit2 />
                                </button>
                                <button
                                  type="button"
                                  disabled={actionId === l.id}
                                  onClick={() => handleDelete(l)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                                  title="Delete"
                                >
                                  <FiTrash2 />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            <div className="bg-white border rounded-xl shadow-sm p-4 max-h-[280px] overflow-y-auto h-full">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Leave Balance Summary</h3>
              <div className="space-y-3">
                {leaveBalanceSummary.length === 0 ? (
                  <p className="text-sm text-gray-500">No leave types found.</p>
                ) : (
                  leaveBalanceSummary.map((leaveType) => (
                    <div key={leaveType.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700">{leaveType.name}</span>
                        <span className="text-gray-500">
                          {leaveType.remaining} / {leaveType.total} days
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{
                            width: `${leaveType.total > 0 ? Math.min(100, (leaveType.remaining / leaveType.total) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <LeaveCalendarWidget leaves={calendarLeaves} className="h-full" />
          </div>
        </div>
      </div>

      <LeaveApplyModal
        open={showApplyModal}
        leaveTypes={leaveTypes}
        staff={staff}
        fetchStaffBalances={fetchStaffBalances}
        onClose={() => setShowApplyModal(false)}
        onSubmit={async (payload) => {
          const res = await fetch('/api/leaves', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const data = await res.json()
          if (data.success) {
            await refresh()
            await alert('Leave request submitted', { title: 'Success', type: 'success' })
            return { ok: true }
          }
          return { ok: false, error: data.error }
        }}
      />

      <LeaveDetailModal
        open={!!selectedLeave && !showEditModal}
        leave={selectedLeave}
        mode={detailMode}
        loading={selectedLeave != null && actionId === selectedLeave.id}
        onClose={() => {
          if (detailMode !== 'view') setDetailMode('view')
          else closeDetail()
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        onCancel={handleCancel}
        onEdit={() => setShowEditModal(true)}
        onDelete={() => handleDelete()}
      />

      <LeaveEditModal
        open={showEditModal}
        leave={selectedLeave}
        leaveTypes={leaveTypes}
        onClose={() => {
          setShowEditModal(false)
          if (!selectedLeave) closeDetail()
        }}
        onSubmit={async (payload) => {
          if (!selectedLeave) return { ok: false, error: 'No leave selected' }
          const res = await fetch(`/api/leaves/${selectedLeave.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const data = await res.json()
          if (data.success) {
            await refresh()
            await alert('Leave updated', { title: 'Success', type: 'success' })
            setShowEditModal(false)
            closeDetail()
            return { ok: true }
          }
          return { ok: false, error: data.error }
        }}
      />
    </DashboardLayout>
  )
}

function SummaryCard({
  title,
  value,
  tone,
}: {
  title: string
  value: number
  tone: 'blue' | 'amber' | 'green' | 'red'
}) {
  const tones: Record<string, string> = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    green: 'border-green-100 bg-green-50 text-green-700',
    red: 'border-red-100 bg-red-50 text-red-700',
  }
  return (
    <div className={`border rounded-xl p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium opacity-80">{title}</p>
      <p className="text-2xl mt-1">{value}</p>
    </div>
  )
}
