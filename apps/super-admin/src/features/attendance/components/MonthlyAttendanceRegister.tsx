'use client'

import React, { useMemo } from 'react'
import {
  getHolidayDayNumbers,
  getMonthLabel,
  getRegisterCellStyle,
  getSundayDayNumbers,
  REGISTER_LEGEND,
  REGISTER_NON_WORKING_COLUMN_CLASS,
  REGISTER_NON_WORKING_HEADER_CLASS,
  type RegisterCellClick,
  type RegisterRow,
} from '@/features/attendance/utils/attendance-status'

interface MonthlyAttendanceRegisterProps {
  rows: RegisterRow[]
  month: number
  year: number
  classLabel?: string
  monthLabel?: string
  entityLabel?: string
  holidayDates?: Set<string>
  loading?: boolean
  emptyMessage?: string
  editable?: boolean
  onCellClick?: (selection: RegisterCellClick) => void
}

export default function MonthlyAttendanceRegister({
  rows,
  month,
  year,
  classLabel,
  monthLabel,
  entityLabel = 'Student',
  holidayDates,
  loading = false,
  emptyMessage = 'No records found for the selected filters.',
  editable = false,
  onCellClick,
}: MonthlyAttendanceRegisterProps) {
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [month, year])
  const sundays = useMemo(
    () => getSundayDayNumbers(month, year, daysInMonth),
    [month, year, daysInMonth],
  )
  const holidays = useMemo(
    () => getHolidayDayNumbers(month, year, holidayDates ?? new Set()),
    [month, year, holidayDates],
  )

  const isNonWorkingDay = (day: number) => sundays.has(day) || holidays.has(day)
  const resolvedMonthLabel = monthLabel ?? `${getMonthLabel(month)} ${year}`

  const buildDate = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const handleCellClick = (row: RegisterRow, day: number, code: string) => {
    if (!editable || !onCellClick) return
    onCellClick({
      personId: row.id,
      personName: row.name,
      day,
      date: buildDate(day),
      code,
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary-600 rounded-full" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 text-sm border border-gray-200 rounded-lg bg-white">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm font-semibold text-gray-800">
        {classLabel ? <span>Class: {classLabel}</span> : <span />}
        <span>Month: {resolvedMonthLabel}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 min-w-[140px]">
                  {entityLabel}
                </th>
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const day = index + 1
                  const nonWorking = isNonWorkingDay(day)
                  return (
                    <th
                      key={day}
                      className={`px-1 py-2 text-center font-semibold min-w-[28px] ${
                        nonWorking
                          ? REGISTER_NON_WORKING_HEADER_CLASS
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {String(day).padStart(2, '0')}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                  <td className="sticky left-0 z-10 bg-white border-r border-gray-100 px-3 py-1.5 font-medium text-gray-900 whitespace-nowrap">
                    {row.name}
                  </td>
                  {row.days.map((code, index) => {
                    const day = index + 1
                    const nonWorking = isNonWorkingDay(day)
                    return (
                      <td
                        key={`${row.id}-${day}`}
                        className={`px-0.5 py-0.5 text-center ${
                          nonWorking ? REGISTER_NON_WORKING_COLUMN_CLASS : ''
                        }`}
                      >
                        {editable ? (
                          <button
                            type="button"
                            onClick={() => handleCellClick(row, day, code)}
                            className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] cursor-pointer transition-transform hover:scale-110 hover:ring-2 hover:ring-primary-400 hover:ring-offset-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${getRegisterCellStyle(code)}`}
                            title={`${code === '-' ? 'Not marked' : code} — click to edit`}
                          >
                            {code}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] ${getRegisterCellStyle(code)}`}
                            title={code === '-' ? 'Not marked' : code}
                          >
                            {code}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        {REGISTER_LEGEND.map((item) => (
          <div key={item.code} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] ${item.style}`}
            >
              {item.code}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
        {editable && (
          <span className="text-xs text-gray-400 italic">Click any cell to mark or update</span>
        )}
      </div>
    </div>
  )
}
