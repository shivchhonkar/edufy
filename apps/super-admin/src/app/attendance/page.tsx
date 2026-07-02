'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FiCheckCircle, FiDownload, FiFilter, FiPrinter } from 'react-icons/fi'
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
import {
  downloadRegisterExcel,
  printRegister,
} from '@/features/attendance/utils/attendance-register-export'
import { formatClassSectionLabel as formatClassLabel } from '@/features/attendance/utils/student-attendance-calendar-export'
import { sortClassesByName } from '@/lib/class-sort'
import { useSettings } from '@/shared/SettingsContext'

interface ClassOption {
  id: number
  name: string
}

interface SectionOption {
  id: number
  class_id: number
  name: string
}

interface StudentRow {
  id: number
  first_name: string
  last_name: string
}

interface AttendanceRecord {
  student_id: number
  date: string
  status: string
}

export default function StudentMonthlyRegisterPage() {
  const { settings } = useSettings()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [sections, setSections] = useState<SectionOption[]>([])
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [migrationRequired, setMigrationRequired] = useState(false)
  const [cellEdit, setCellEdit] = useState<RegisterCellEditContext | null>(null)
  const [cellModalOpen, setCellModalOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const sorted = sortClassesByName(data.data as ClassOption[])
          setClasses(sorted)
          setClassId((prev) => prev || (sorted[0] ? String(sorted[0].id) : ''))
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!classId) {
      setSections([])
      setSectionId('')
      return
    }
    fetch(`/api/sections?class_id=${classId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSections(data.data)
      })
      .catch(console.error)
  }, [classId])

  const loadRegister = useCallback(async () => {
    if (!classId) {
      setStudents([])
      setRecords([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { start, end } = getMonthDateRange(month, year)
      const studentParams = new URLSearchParams({
        class_id: classId,
        limit: '500',
        status: 'active',
      })
      if (sectionId) studentParams.set('section_id', sectionId)

      const attendanceParams = new URLSearchParams({ start_date: start, end_date: end })
      attendanceParams.set('class_id', classId)
      if (sectionId) attendanceParams.set('section_id', sectionId)

      const holidayParams = new URLSearchParams({ start_date: start, end_date: end })

      const [studentsRes, attendanceRes, holidaysRes] = await Promise.all([
        fetch(`/api/students?${studentParams.toString()}`),
        fetch(`/api/attendance/students?${attendanceParams.toString()}`),
        fetch(`/api/holidays?${holidayParams.toString()}`),
      ])

      const studentsData = await studentsRes.json()
      const attendanceData = await attendanceRes.json()
      const holidaysData = await holidaysRes.json()

      if (studentsData.success) {
        setStudents(studentsData.data)
      } else {
        setStudents([])
      }

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
        const dates = new Set<string>(
          (holidaysData.data as { date: string }[]).map((h) => String(h.date).slice(0, 10)),
        )
        setHolidayDates(dates)
      } else {
        setHolidayDates(new Set())
      }
    } catch (error) {
      console.error('Error loading student register:', error)
    } finally {
      setLoading(false)
    }
  }, [classId, sectionId, month, year])

  useEffect(() => {
    loadRegister()
  }, [loadRegister])

  const registerRows = useMemo(
    () =>
      buildMonthlyRegisterRows(
        students.map((s) => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`.trim(),
        })),
        records.map((r) => ({
          personId: r.student_id,
          date: r.date,
          status: r.status,
        })),
        month,
        year,
        holidayDates,
      ),
    [students, records, month, year, holidayDates],
  )

  const classLabel = useMemo(() => {
    const className = classes.find((c) => String(c.id) === classId)?.name
    const sectionName = sections.find((s) => String(s.id) === sectionId)?.name
    return formatClassLabel(className, sectionName, 'Select class')
  }, [classes, classId, sections, sectionId])

  const filterSummary = useMemo(() => {
    const monthName = getMonthLabel(month)
    const sectionPart =
      sectionId && sections.length
        ? ` · ${sections.find((s) => String(s.id) === sectionId)?.name ?? 'Section'}`
        : classId
          ? ' · All Sections'
          : ''
    return `${classId ? classLabel : 'No class'}${sectionPart} · ${monthName} ${year}`
  }, [classId, classLabel, sectionId, sections, month, year])

  const canExport = registerRows.length > 0 && !loading

  const exportOptions = useMemo(
    () => ({
      rows: registerRows,
      month,
      year,
      entityLabel: 'Student',
      classLabel: classId ? classLabel : undefined,
      holidayDates,
      schoolName: settings.school_name || 'School',
      filePrefix: 'student-attendance',
    }),
    [registerRows, month, year, classId, classLabel, holidayDates, settings.school_name],
  )

  const handlePrint = () => printRegister(exportOptions)
  const handleDownload = () => downloadRegisterExcel(exportOptions)

  const handleCellClick = useCallback(
    (selection: RegisterCellClick) => {
      const record = records.find(
        (r) =>
          r.student_id === selection.personId &&
          String(r.date).slice(0, 10) === selection.date,
      )
      setCellEdit({
        ...selection,
        remarks: record?.remarks,
      })
      setCellModalOpen(true)
    },
    [records],
  )

  const handleCellSaved = () => {
    loadRegister()
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Attendance Register</h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              View student attendance by class and month.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              aria-expanded={expanded}
            >
              <FiFilter size={14} />
              Filter
            </button>
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
              href="/attendance/students"
              className="inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              <FiCheckCircle size={14} />
              Mark Attendance
            </Link> */}
          </div>
        </div>

        {/* <AttendanceRegisterNav /> */}

        <AttendanceRegisterFilters expanded={expanded} summary={filterSummary}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="block text-xs font-medium text-gray-600">
              Class
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value)
                  setSectionId('')
                }}
                className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Section
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!classId}
                className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white disabled:bg-gray-50"
              >
                <option value="">All Sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
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
            Student attendance is not set up yet. Mark attendance to build records.
          </div>
        )}

        <MonthlyAttendanceRegister
          rows={registerRows}
          month={month}
          year={year}
          classLabel={classId ? classLabel : undefined}
          holidayDates={holidayDates}
          loading={loading}
          editable={!migrationRequired && Boolean(classId)}
          onCellClick={handleCellClick}
          emptyMessage={
            classId
              ? 'No students found for the selected class and section.'
              : 'Select a class to view the monthly register.'
          }
        />

        <RegisterCellAttendanceModal
          isOpen={cellModalOpen}
          onClose={() => {
            setCellModalOpen(false)
            setCellEdit(null)
          }}
          onSuccess={handleCellSaved}
          context={cellEdit}
          variant="student"
        />
      </div>
    </DashboardLayout>
  )
}
