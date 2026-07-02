'use client'

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { getMonthLabel } from '@/features/attendance/utils/attendance-status'

interface MonthYearNavigatorProps {
  month: number
  year: number
  onChange: (month: number, year: number) => void
  className?: string
}

export default function MonthYearNavigator({
  month,
  year,
  onChange,
  className = '',
}: MonthYearNavigatorProps) {
  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1)
    onChange(next.getMonth() + 1, next.getFullYear())
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => shiftMonth(-1)}
        className="rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-50"
        aria-label="Previous month"
      >
        <FiChevronLeft size={18} />
      </button>
      <span className="min-w-[9rem] text-center text-sm font-medium text-gray-900">
        {getMonthLabel(month)} {year}
      </span>
      <button
        type="button"
        onClick={() => shiftMonth(1)}
        className="rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-50"
        aria-label="Next month"
      >
        <FiChevronRight size={18} />
      </button>
    </div>
  )
}
