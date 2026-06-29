'use client'

import { useState, useEffect } from 'react'
import { FiCalendar, FiBookOpen, FiClipboard, FiUsers } from 'react-icons/fi'
import { StatCard, PortalPageShell, PortalLoadingSpinner } from '@edulakhya/ui'
import Link from 'next/link'
import { getAuthHeaders } from '@/lib/teacher-portal/client-auth'
import { teacherApi, teacherRoute } from '@/lib/teacher-portal/constants'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

type DashboardStats = {
  assigned_classes: number
  pending_leaves: number
  active_homework: number
  attendance_marked_today: number
}

type Assignment = {
  id: number
  class_id: number
  section_id: number | null
  subject_id: number | null
  class_name: string
  section_name: string | null
  subject_name: string | null
  is_class_teacher: boolean
}

export default function TeacherDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setUserName(user.full_name || user.email || '')
      } catch {
        /* ignore */
      }
    }

    const headers = { ...getAuthHeaders() }

    Promise.all([
      fetch(teacherApi('/dashboard/stats'), { headers }).then((r) => r.json()),
      fetch(teacherApi('/assignments'), { headers }).then((r) => r.json()),
    ])
      .then(([statsRes, assignmentsRes]) => {
        if (statsRes.success) setStats(statsRes.data)
        if (assignmentsRes.success) setAssignments(assignmentsRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <PortalPageShell
      greeting={userName ? `${getGreeting()}, ${userName.split(' ')[0]}` : getGreeting()}
      title="Teacher Dashboard"
      subtitle="Manage attendance, homework, and leave for your assigned classes"
    >
      {loading ? (
        <PortalLoadingSpinner />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Assigned Classes"
              value={String(stats?.assigned_classes ?? 0)}
              icon={FiUsers}
              color="green"
            />
            <StatCard
              title="Attendance Marked Today"
              value={String(stats?.attendance_marked_today ?? 0)}
              icon={FiCalendar}
              color="blue"
            />
            <StatCard
              title="Active Homework"
              value={String(stats?.active_homework ?? 0)}
              icon={FiBookOpen}
              color="purple"
            />
            <StatCard
              title="Pending Leaves"
              value={String(stats?.pending_leaves ?? 0)}
              icon={FiClipboard}
              color="yellow"
            />
          </div>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900">My Class Assignments</h2>
              <div className="flex gap-2">
                <Link
                  href={teacherRoute('/attendance')}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700"
                >
                  Mark Attendance
                </Link>
                <Link
                  href={teacherRoute('/homework')}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-xl hover:bg-slate-50"
                >
                  Assign Homework
                </Link>
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                No class assignments found. Contact school administration to get assigned to classes.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {assignments.map((a) => (
                    <div key={a.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <h4 className="font-medium text-slate-900">
                          {a.class_name}
                          {a.section_name ? ` — ${a.section_name}` : ''}
                        </h4>
                        <p className="text-sm text-slate-600">
                          {a.subject_name || 'General'}
                          {a.is_class_teacher ? ' · Class Teacher' : ''}
                        </p>
                      </div>
                      <Link
                        href={teacherRoute(
                          `/attendance?class_id=${a.class_id}${a.section_id ? `&section_id=${a.section_id}` : ''}`,
                        )}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Take attendance →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </PortalPageShell>
  )
}
