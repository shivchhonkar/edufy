'use client'

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useEffect, useState } from 'react'
import type { LeaveBalance, LeaveRecord, LeaveType } from '@/features/hr/types/leave'
import { countWorkingDays } from '@/lib/leave-utils'

interface Props {
  open: boolean
  leaveTypes: LeaveType[]
  staff: { id: number; first_name: string; last_name: string }[]
  onClose: () => void
  onSubmit: (payload: {
    staff_id: number
    leave_type_id: number
    start_date: string
    end_date: string
    reason: string
  }) => Promise<{ ok: boolean; error?: string }>
  fetchStaffBalances: (staffId: number) => Promise<LeaveBalance[]>
}

export default function LeaveApplyModal({
  open,
  leaveTypes,
  staff,
  onClose,
  onSubmit,
  fetchStaffBalances,
}: Props) {
  const [form, setForm] = useState({ staff_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setForm({ staff_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' })
      setBalances([])
      setError('')
    }
  }, [open])

  useEffect(() => {
    if (!form.staff_id) {
      setBalances([])
      return
    }
    fetchStaffBalances(parseInt(form.staff_id, 10)).then(setBalances)
  }, [form.staff_id, fetchStaffBalances])

  if (!open) return null

  const days =
    form.start_date && form.end_date ? countWorkingDays(form.start_date, form.end_date) : 0
  const selectedBalance = balances.find((b) => String(b.leave_type_id) === form.leave_type_id)
  const remaining =
    selectedBalance != null
      ? Math.max(
          Number(selectedBalance.allocated || selectedBalance.max_days_per_year || 0) -
            Number(selectedBalance.used || 0),
          0,
        )
      : null

  const handleSubmit = async () => {
    setError('')
    if (!form.staff_id || !form.leave_type_id || !form.start_date || !form.end_date) {
      setError('Please fill all required fields')
      return
    }
    if (days <= 0) {
      setError('Select valid dates with at least one working day')
      return
    }
    setSubmitting(true)
    const result = await onSubmit({
      staff_id: parseInt(form.staff_id, 10),
      leave_type_id: parseInt(form.leave_type_id, 10),
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason,
    })
    setSubmitting(false)
    if (result.ok) onClose()
    else setError(result.error || 'Failed to submit leave')
  }

  return (
    <AppModal open onClose={onClose}>
      <div className={APP_MODAL_PANEL}>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Apply Leave</h2>
          <p className="text-sm text-gray-500 mt-1">Submit a leave request on behalf of staff</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Staff *</span>
            <select
              value={form.staff_id}
              onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Select staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Leave type *</span>
            <select
              value={form.leave_type_id}
              onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.max_days_per_year ? ` (${t.max_days_per_year} days/yr)` : ''}
                </option>
              ))}
            </select>
          </label>

          {form.staff_id && balances.length > 0 && (
            <div className="rounded-lg bg-gray-50 border p-3 text-xs space-y-1">
              <p className="font-medium text-gray-700">Leave balance</p>
              {balances.map((b) => (
                <div key={b.leave_type_id} className="flex justify-between text-gray-600">
                  <span>{b.leave_type_name}</span>
                  <span>
                    {Math.max(Number(b.allocated || b.max_days_per_year || 0) - Number(b.used || 0), 0)} /{' '}
                    {b.allocated || b.max_days_per_year || '—'} days left
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">Start date *</span>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">End date *</span>
              <input
                type="date"
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>

          {days > 0 && (
            <p className="text-sm text-gray-600">
              Working days: <span className="font-medium">{days}</span>
              {remaining != null && (
                <span className={days > remaining ? ' text-red-600 ml-2' : ' ml-2'}>
                  ({remaining} remaining for selected type)
                </span>
              )}
            </p>
          )}

          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Reason</span>
            <textarea
              placeholder="Reason for leave"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm" disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </AppModal>
  )
}

export function LeaveEditModal({
  open,
  leave,
  leaveTypes,
  onClose,
  onSubmit,
}: {
  open: boolean
  leave: LeaveRecord | null
  leaveTypes: LeaveType[]
  onClose: () => void
  onSubmit: (payload: {
    leave_type_id: number
    start_date: string
    end_date: string
    reason: string
  }) => Promise<{ ok: boolean; error?: string }>
}) {
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (leave && open) {
      setForm({
        leave_type_id: String(leave.leave_type_id),
        start_date: String(leave.start_date).split('T')[0],
        end_date: String(leave.end_date).split('T')[0],
        reason: leave.reason || '',
      })
      setError('')
    }
  }, [leave, open])

  if (!open || !leave) return null

  const days =
    form.start_date && form.end_date ? countWorkingDays(form.start_date, form.end_date) : 0

  const handleSubmit = async () => {
    setError('')
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      setError('Please fill all required fields')
      return
    }
    setSubmitting(true)
    const result = await onSubmit({
      leave_type_id: parseInt(form.leave_type_id, 10),
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason,
    })
    setSubmitting(false)
    if (result.ok) onClose()
    else setError(result.error || 'Failed to update leave')
  }

  return (
    <AppModal open onClose={onClose}>
      <div className={APP_MODAL_PANEL}>
        <h2 className="text-lg font-bold text-gray-900">Edit Leave Request</h2>
        <p className="text-sm text-gray-500">
          {leave.first_name} {leave.last_name}
        </p>

        <select
          value={form.leave_type_id}
          onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
        >
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.end_date}
            min={form.start_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {days > 0 && <p className="text-sm text-gray-600">Working days: {days}</p>}

        <textarea
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          rows={3}
          placeholder="Reason"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </AppModal>
  )
}
