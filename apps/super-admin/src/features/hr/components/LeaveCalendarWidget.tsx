'use client'

import { useMemo, useState } from 'react'
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import type { LeaveRecord } from '@/features/hr/types/leave'

interface Props {
  leaves: LeaveRecord[]
  className?: string
}

export default function LeaveCalendarWidget({ leaves, className = '' }: Props) {
  const [viewDate, setViewDate] = useState(() => new Date())

  const { year, month, days, leaveDates } = useMemo(() => {
    const y = viewDate.getFullYear()
    const m = viewDate.getMonth()
    const daysInMonth = new Date(y, m + 1, 0).getDate()

    const approvedLeaves = leaves.filter((l) => l.status === 'approved')
    const dateSet = new Set<string>()

    for (const leave of approvedLeaves) {
      const start = new Date(String(leave.start_date).split('T')[0])
      const end = new Date(String(leave.end_date).split('T')[0])
      const cur = new Date(start)
      while (cur <= end) {
        if (cur.getMonth() === m && cur.getFullYear() === y) {
          const day = cur.getDay()
          if (day !== 0 && day !== 6) {
            dateSet.add(String(cur.getDate()))
          }
        }
        cur.setDate(cur.getDate() + 1)
      }
    }

    return { year: y, month: m, days: daysInMonth, leaveDates: dateSet }
  }, [viewDate, leaves])

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const label = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const leadingBlanks = Array.from({ length: new Date(year, month, 1).getDay() })
  const monthDays = Array.from({ length: days }, (_, i) => i + 1)
  const trailing = 42 - leadingBlanks.length - monthDays.length

  return (
    <div className={`bg-white border rounded-xl shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="text-gray-400 hover:text-gray-600 p-1">
          <FiChevronLeft />
        </button>
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FiCalendar /> {label}
        </h3>
        <button type="button" onClick={nextMonth} className="text-gray-400 hover:text-gray-600 p-1">
          <FiChevronRight />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-500 text-center mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">
        {leadingBlanks.map((_, i) => (
          <div key={`b-${i}`} className="h-7" />
        ))}
        {monthDays.map((day) => {
          const hasLeave = leaveDates.has(String(day))
          return (
            <div
              key={day}
              className={`h-7 rounded flex items-center justify-center relative ${
                hasLeave ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={hasLeave ? 'Staff on approved leave' : undefined}
            >
              {day}
              {hasLeave && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500" />
              )}
            </div>
          )
        })}
        {Array.from({ length: Math.max(trailing, 0) }).map((_, i) => (
          <div key={`t-${i}`} className="h-7" />
        ))}
      </div>

      <p className="text-[11px] text-gray-400 mt-3">Dots indicate approved leave days</p>
    </div>
  )
}
