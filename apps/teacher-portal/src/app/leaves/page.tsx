'use client'

import { useEffect, useState } from 'react'
import { PortalPageShell, PortalLoadingSpinner } from '@edulakhya/ui'
import { format } from 'date-fns'
import { getAuthHeaders } from '@/lib/auth'

type LeaveType = {
  id: number
  name: string
  remaining: number
  max_days_per_year: number | null
}

type Leave = {
  id: number
  leave_type_name: string
  start_date: string
  end_date: string
  days_requested: number
  reason: string | null
  status: string
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-600',
}

export default function LeavesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  })

  const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' }

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/leave-types', { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch('/api/leaves', { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([typesRes, leavesRes]) => {
        if (typesRes.success) setLeaveTypes(typesRes.data)
        if (leavesRes.success) setLeaves(leavesRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          leave_type_id: parseInt(form.leave_type_id, 10),
          start_date: form.start_date,
          end_date: form.end_date,
          reason: form.reason,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage('Leave application submitted successfully')
        setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
        setShowForm(false)
        loadData()
      } else {
        setError(data.error || 'Failed to apply for leave')
      }
    } catch {
      setError('Failed to apply for leave')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PortalPageShell
      title="Leave Management"
      subtitle="Apply for leave and track your leave requests"
    >
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700"
        >
          {showForm ? 'Cancel' : 'Apply for Leave'}
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">New Leave Application</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
              <select
                required
                value={form.leave_type_id}
                onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name}
                    {lt.max_days_per_year != null ? ` (${lt.remaining} days remaining)` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Optional reason for leave"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <PortalLoadingSpinner />
      ) : (
        <>
          {leaveTypes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {leaveTypes.map((lt) => (
                <div key={lt.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-600">{lt.name}</p>
                  <p className="text-2xl font-bold text-slate-900">{lt.remaining}</p>
                  <p className="text-xs text-slate-500">days remaining</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Leave History</h3>
            </div>
            {leaves.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No leave applications yet</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {leaves.map((leave) => (
                  <div key={leave.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{leave.leave_type_name}</p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(leave.start_date), 'dd MMM yyyy')} —{' '}
                        {format(new Date(leave.end_date), 'dd MMM yyyy')} · {leave.days_requested}{' '}
                        day(s)
                      </p>
                      {leave.reason && (
                        <p className="text-sm text-slate-500 mt-1">{leave.reason}</p>
                      )}
                    </div>
                    <span
                      className={`self-start px-3 py-1 text-xs font-medium rounded-full capitalize ${
                        STATUS_STYLES[leave.status] || STATUS_STYLES.pending
                      }`}
                    >
                      {leave.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </PortalPageShell>
  )
}
