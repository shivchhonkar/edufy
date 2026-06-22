'use client'

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useEffect, useState } from 'react'
import type { LeaveRecord } from '@/features/hr/types/leave'
import { FiCheck, FiX } from 'react-icons/fi'

type Mode = 'view' | 'approve' | 'reject'

interface Props {
  open: boolean
  leave: LeaveRecord | null
  mode: Mode
  loading?: boolean
  onClose: () => void
  onApprove: (remarks?: string) => void
  onReject: (remarks: string) => void
  onCancel?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

const statusColor: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function LeaveDetailModal({
  open,
  leave,
  mode,
  loading,
  onClose,
  onApprove,
  onReject,
  onCancel,
  onEdit,
  onDelete,
}: Props) {
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (open) setRemarks('')
  }, [open, leave?.id, mode])

  if (!open || !leave) return null

  const fmt = (d?: string) => (d ? String(d).split('T')[0] : '—')

  const title =
    mode === 'approve' ? 'Approve Leave' : mode === 'reject' ? 'Reject Leave' : 'Leave Details'

  return (
    <AppModal open onClose={onClose}>
      <div className={APP_MODAL_PANEL}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900 text-base">
                {leave.first_name} {leave.last_name}
              </p>
              <p className="text-gray-500">{leave.department_name || 'Unassigned'}</p>
              {leave.employee_id && <p className="text-xs text-gray-400">ID: {leave.employee_id}</p>}
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs capitalize ${statusColor[leave.status] || ''}`}>
              {leave.status}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <Detail label="Leave type" value={leave.leave_type_name} />
            <Detail label="Days" value={String(leave.days_requested)} />
            <Detail label="Start date" value={fmt(leave.start_date)} />
            <Detail label="End date" value={fmt(leave.end_date)} />
            <Detail label="Applied on" value={fmt(leave.created_at)} className="col-span-2" />
            <Detail label="Reason" value={leave.reason || '—'} className="col-span-2" />
            {leave.approved_by_name && (
              <Detail label="Reviewed by" value={leave.approved_by_name} className="col-span-2" />
            )}
            {leave.approved_at && (
              <Detail label="Reviewed on" value={fmt(leave.approved_at)} className="col-span-2" />
            )}
            {leave.remarks && (
              <Detail label="Admin remarks" value={leave.remarks} className="col-span-2" />
            )}
          </dl>

          {(mode === 'approve' || mode === 'reject') && (
            <label className="block">
              <span className="text-gray-700 font-medium">
                {mode === 'reject' ? 'Rejection reason *' : 'Remarks (optional)'}
              </span>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                rows={3}
                placeholder={mode === 'reject' ? 'Explain why this leave is rejected' : 'Optional note'}
              />
            </label>
          )}
        </div>

        <div className="px-6 py-4 border-t flex flex-wrap gap-2 justify-end sticky bottom-0 z-10 shrink-0 bg-white">
          {mode === 'view' && leave.status === 'pending' && (
            <>
              {onEdit && (
                <button type="button" onClick={onEdit} className="px-3 py-2 border rounded-lg text-sm">
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={() => onReject('')}
                className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-1"
              >
                <FiX /> Reject
              </button>
              <button
                type="button"
                onClick={() => onApprove()}
                className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"
              >
                <FiCheck /> Approve
              </button>
            </>
          )}

          {mode === 'view' && leave.status === 'approved' && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 border border-amber-200 text-amber-700 rounded-lg text-sm"
            >
              Cancel Leave
            </button>
          )}

          {mode === 'approve' && (
            <>
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => onApprove(remarks)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-60 flex items-center gap-1"
              >
                <FiCheck /> {loading ? 'Approving...' : 'Confirm Approve'}
              </button>
            </>
          )}

          {mode === 'reject' && (
            <>
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">
                Back
              </button>
              <button
                type="button"
                disabled={loading || !remarks.trim()}
                onClick={() => onReject(remarks)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-60"
              >
                {loading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </>
          )}

          {mode === 'view' && (
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">
              Close
            </button>
          )}
        </div>
      </div>
    </AppModal>
  )
}

function Detail({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-gray-900 mt-0.5">{value}</dd>
    </div>
  )
}
