'use client'

import React, { useEffect, useState } from 'react'
import { FiCalendar, FiUser, FiX } from 'react-icons/fi'
import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal'
import {
  ATTENDANCE_STATUS_OPTIONS,
  registerCodeToStatus,
} from '@/features/attendance/utils/attendance-status'

export interface RegisterCellEditContext {
  personId: number
  personName: string
  date: string
  code: string
  remarks?: string
}

interface RegisterCellAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  context: RegisterCellEditContext | null
  variant: 'student' | 'staff'
  entityLabel?: string
}

export default function RegisterCellAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  context,
  variant,
  entityLabel,
}: RegisterCellAttendanceModalProps) {
  const [status, setStatus] = useState('present')
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const label = entityLabel ?? (variant === 'student' ? 'Student' : 'Staff')

  useEffect(() => {
    if (!context) return
    setStatus(registerCodeToStatus(context.code))
    setRemarks(context.remarks ?? '')
    setError('')
  }, [context, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!context) return

    setLoading(true)
    setError('')

    try {
      const url = variant === 'student' ? '/api/attendance/students' : '/api/attendance'
      const body =
        variant === 'student'
          ? {
              student_id: context.personId,
              date: context.date,
              status,
              remarks: remarks || null,
            }
          : {
              staff_id: context.personId,
              attendance_date: context.date,
              status,
              attendance_type: 'manual',
              remarks: remarks || null,
            }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'Failed to save attendance')
      }
    } catch (err) {
      console.error('Error saving register cell attendance:', err)
      setError('An error occurred while saving attendance')
    } finally {
      setLoading(false)
    }
  }

  const formattedDate = context
    ? new Date(`${context.date}T12:00:00`).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : ''

  return (
    <AppModal open={isOpen && Boolean(context)} onClose={onClose}>
      <div className={`${APP_MODAL_PANEL} max-w-md w-full`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Mark Attendance</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {context && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <FiUser className="w-3.5 h-3.5 text-gray-400" />
                {context.personName}
              </p>
              <p className="text-sm text-gray-600 flex items-center gap-1.5">
                <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                {formattedDate}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                      status === option.value
                        ? `${option.style} border-current ring-2 ring-primary-500 ring-offset-1`
                        : `${option.style} border-transparent opacity-80 hover:opacity-100`
                    }`}
                  >
                    <span>{option.code}</span>
                    <span className="font-normal">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Optional notes..."
                className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppModal>
  )
}
