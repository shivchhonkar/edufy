'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FiCheckCircle, FiDownload, FiPrinter } from 'react-icons/fi'
import DashboardLayout from '@/shared/components/layout/DashboardLayout'
import MonthlyAttendanceRegister from '@/features/attendance/components/MonthlyAttendanceRegister'
import AttendanceRegisterNav from '@/features/attendance/components/AttendanceRegisterNav'
import AttendanceRegisterFilters from '@/features/attendance/components/AttendanceRegisterFilters'
import MonthYearNavigator from '@/features/attendance/components/MonthYearNavigator'
import RegisterCellAttendanceModal, {
  type RegisterCellEditContext,
} from '@/features/attendance/components/RegisterCellAttendanceModal'
import {
  buildMonthlyRegisterRows,
  getMonthDateRange,
  getMonthLabel,
  type RegisterCellClick,
} from '@/features/attendance/utils/attendance-status'
import { collectHolidayDates } from '@/lib/holiday-utils'
import {
  downloadRegisterExcel,
  printRegister,
} from '@/features/attendance/utils/attendance-register-export'
import { useSettings } from '@/shared/SettingsContext'

interface StaffRow {
  id: number
  first_name: string
  last_name: string
  in_time?: string | null
  out_time?: string | null
}

interface AttendanceRecord {
  staff_id: number
  attendance_date: string
  status: string
  remarks?: string
  check_in_time?: string | null
  check_out_time?: string | null
}

export default function StaffMonthlyRegisterPage() {
  const { settings } = useSettings()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set())
  const [nonWorkingWeekdays, setNonWorkingWeekdays] = useState<Set<number>>(new Set([0]))
  const [loading, setLoading] = useState(true)
  const [migrationRequired, setMigrationRequired] = useState(false)
  const [cellEdit, setCellEdit] = useState<RegisterCellEditContext | null>(null)
  const [cellModalOpen, setCellModalOpen] = useState(false)

  const loadRegister = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end } = getMonthDateRange(month, year)
      const attendanceParams = new URLSearchParams({ start_date: start, end_date: end })
      const holidayParams = new URLSearchParams({ start_date: start, end_date: end, scope: 'school' })

      const [staffRes, attendanceRes, holidaysRes, workingRes] = await Promise.all([
        fetch('/api/staff?limit=500&status=active'),
        fetch(`/api/attendance?${attendanceParams.toString()}`),
        fetch(`/api/holidays?${holidayParams.toString()}`),
        fetch('/api/settings/working-days'),
      ])

      const staffData = await staffRes.json()
      const attendanceData = await attendanceRes.json()
      const holidaysData = await holidaysRes.json()
      const workingData = await workingRes.json()

      setStaff(staffData.success ? staffData.data : [])

      if (attendanceData.success) {
        setRecords(attendanceData.data)
        setMigrationRequired(false)
      } else if (attendanceData.migration_required) {
        setMigrationRequired(true)
        setRecords([])
      } else {
        setRecords([])
      }

      if (holidaysData.success) {
        setHolidayDates(new Set(collectHolidayDates(holidaysData.data || [])))
      } else {
        setHolidayDates(new Set())
      }

      if (workingData.success) {
        const closed = (workingData.data.school_days as { day_of_week: number; is_working: boolean }[])
          .filter((day) => !day.is_working)
          .map((day) => day.day_of_week)
        setNonWorkingWeekdays(new Set(closed))
      } else {
        setNonWorkingWeekdays(new Set([0]))
      }
    } catch (error) {
      console.error('Error loading staff register:', error)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    loadRegister()
  }, [loadRegister])

  const registerRows = useMemo(
    () =>
      buildMonthlyRegisterRows(
        staff.map((s) => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`.trim(),
        })),
        records.map((r) => ({
          personId: r.staff_id,
          date: r.attendance_date,
          status: r.status,
        })),
        month,
        year,
        holidayDates,
      ),
    [staff, records, month, year, holidayDates],
  )

  const filterSummary = useMemo(
    () => `${getMonthLabel(month)} ${year} · All Staff`,
    [month, year],
  )

  const canExport = registerRows.length > 0 && !loading

  const exportOptions = useMemo(
    () => ({
      rows: registerRows,
      month,
      year,
      entityLabel: 'Staff',
      holidayDates,
      schoolName: settings.school_name || 'School',
      filePrefix: 'staff-attendance',
    }),
    [registerRows, month, year, holidayDates, settings.school_name],
  )

  const handlePrint = () => printRegister(exportOptions)
  const handleDownload = () => downloadRegisterExcel(exportOptions)

  const handleCellClick = useCallback(
    (selection: RegisterCellClick) => {
      const record = records.find(
        (r) =>
          r.staff_id === selection.personId &&
          String(r.attendance_date).slice(0, 10) === selection.date,
      )
      const member = staff.find((row) => row.id === selection.personId)
      setCellEdit({
        ...selection,
        remarks: record?.remarks,
        checkIn: record?.check_in_time,
        checkOut: record?.check_out_time,
        workStart: member?.in_time,
        workEnd: member?.out_time,
      })
      setCellModalOpen(true)
    },
    [records, staff],
  )

  const handleCellSaved = () => {
    loadRegister()
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Employee Register</h1>
            {/* <p className="text-gray-500 mt-0.5 text-sm">
              View staff attendance by month.
            </p> */}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!canExport}
              className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FiPrinter size={14} />
              Print
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!canExport}
              className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FiDownload size={14} />
              Download Excel
            </button>
            {/* <Link
              href="/attendance/staff"
              className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              <FiCheckCircle size={14} />
              Mark Attendance
            </Link> */}
          </div>
        </div>

        {/* <AttendanceRegisterNav /> */}

        <AttendanceRegisterFilters summary={filterSummary}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            <label className="block text-xs font-medium text-gray-600">
              Month
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Year
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm"
              />
            </label>
          </div>
        </AttendanceRegisterFilters>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">{filterSummary}</p>
          <MonthYearNavigator
            month={month}
            year={year}
            onChange={(nextMonth, nextYear) => {
              setMonth(nextMonth)
              setYear(nextYear)
            }}
          />
        </div>

        {migrationRequired && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-xs">
            Staff attendance is not set up yet. Run the migration or mark attendance to build records.
          </div>
        )}

        <MonthlyAttendanceRegister
          rows={registerRows}
          month={month}
          year={year}
          entityLabel="Staff"
          holidayDates={holidayDates}
          nonWorkingWeekdays={nonWorkingWeekdays}
          loading={loading}
          editable={!migrationRequired}
          onCellClick={handleCellClick}
          emptyMessage="No staff members found."
        />

        <RegisterCellAttendanceModal
          isOpen={cellModalOpen}
          onClose={() => {
            setCellModalOpen(false)
            setCellEdit(null)
          }}
          onSuccess={handleCellSaved}
          context={cellEdit}
          variant="staff"
        />
      </div>
    </DashboardLayout>
  )
}
