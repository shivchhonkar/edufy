'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PortalPageShell, PortalLoadingSpinner } from '@edulakhya/ui'
import { format } from 'date-fns'
import { getAuthHeaders } from '@/lib/teacher-portal/client-auth'

type Assignment = {
  id: number
  class_id: number
  section_id: number | null
  class_name: string
  section_name: string | null
  subject_name: string | null
}

type Student = {
  id: number
  first_name: string
  last_name: string
  admission_number: string
  roll_number: string | null
}

type AttendanceRecord = {
  student_id: number
  status: string
  remarks?: string | null
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'late', label: 'Late', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'half_day', label: 'Half Day', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'on_leave', label: 'On Leave', color: 'bg-blue-100 text-blue-800 border-blue-300' },
]

function AttendanceContent() {
  const searchParams = useSearchParams()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<number, AttendanceRecord>>({})
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' }

  useEffect(() => {
    fetch('/api/teacher/assignments', { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAssignments(data.data)
          const classId = searchParams.get('class_id')
          const sectionId = searchParams.get('section_id')
          if (classId) setSelectedClass(classId)
          if (sectionId) setSelectedSection(sectionId)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [searchParams])

  const loadStudentsAndAttendance = useCallback(async () => {
    if (!selectedClass) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ class_id: selectedClass, date })
      if (selectedSection) params.set('section_id', selectedSection)

      const [studentsRes, attendanceRes] = await Promise.all([
        fetch(`/api/teacher/students?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
        fetch(`/api/teacher/attendance?${params}`, { headers: getAuthHeaders() }).then((r) => r.json()),
      ])

      if (!studentsRes.success) {
        setError(studentsRes.error || 'Failed to load students')
        return
      }

      setStudents(studentsRes.data)

      const attendanceMap: Record<number, AttendanceRecord> = {}
      if (attendanceRes.success) {
        for (const row of attendanceRes.data) {
          attendanceMap[row.student_id] = {
            student_id: row.student_id,
            status: row.status || 'present',
            remarks: row.remarks,
          }
        }
      }

      for (const student of studentsRes.data) {
        if (!attendanceMap[student.id]) {
          attendanceMap[student.id] = { student_id: student.id, status: 'present' }
        }
      }

      setAttendance(attendanceMap)
    } catch {
      setError('Failed to load class data')
    } finally {
      setLoading(false)
    }
  }, [selectedClass, selectedSection, date])

  useEffect(() => {
    if (selectedClass) loadStudentsAndAttendance()
  }, [selectedClass, selectedSection, date, loadStudentsAndAttendance])

  const uniqueClasses = Array.from(
    new Map(assignments.map((a) => [a.class_id, a])).values(),
  )

  const sectionsForClass = assignments.filter(
    (a) => String(a.class_id) === selectedClass && a.section_id,
  )

  const setStatus = (studentId: number, status: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], student_id: studentId, status },
    }))
  }

  const markAll = (status: string) => {
    const updated: Record<number, AttendanceRecord> = {}
    for (const student of students) {
      updated[student.id] = { student_id: student.id, status }
    }
    setAttendance(updated)
  }

  const handleSave = async () => {
    if (!selectedClass) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/teacher/attendance', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          class_id: parseInt(selectedClass, 10),
          section_id: selectedSection ? parseInt(selectedSection, 10) : null,
          date,
          attendance_records: Object.values(attendance),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message || 'Attendance saved successfully')
      } else {
        setError(data.error || 'Failed to save attendance')
      }
    } catch {
      setError('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalPageShell
      title="Mark Attendance"
      subtitle="Record daily attendance for students in your assigned classes"
    >
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value)
                setSelectedSection('')
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="">Select class</option>
              {uniqueClasses.map((a) => (
                <option key={a.class_id} value={a.class_id}>
                  {a.class_name}
                </option>
              ))}
            </select>
          </div>
          {sectionsForClass.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="">All sections</option>
                {sectionsForClass.map((a) => (
                  <option key={a.section_id!} value={a.section_id!}>
                    {a.section_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => markAll('present')}
              disabled={!students.length}
              className="px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
            >
              All Present
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !students.length}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
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

      {!selectedClass ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          Select a class to mark attendance
        </div>
      ) : loading ? (
        <PortalLoadingSpinner />
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          No students found in this class
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {students.map((student) => (
              <div key={student.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {student.admission_number}
                    {student.roll_number ? ` · Roll ${student.roll_number}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(student.id, opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        attendance[student.id]?.status === opt.value
                          ? opt.color
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PortalPageShell>
  )
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<PortalLoadingSpinner />}>
      <AttendanceContent />
    </Suspense>
  )
}
