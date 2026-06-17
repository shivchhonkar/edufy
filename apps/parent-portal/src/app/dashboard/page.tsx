'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiUser,
  FiCalendar,
  FiBook,
  FiVideo,
  FiFileText,
  FiAward,
  FiCheck,
  FiChevronRight,
  FiClock,
} from 'react-icons/fi'
import { formatCurrency } from '@edulakhya/utils'
import RupeeIcon from '@/components/icons/RupeeIcon'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  RupeeIcon,
  FiCalendar,
  FiBook,
  FiUser,
  FiVideo,
  FiFileText,
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [selectedChild, setSelectedChild] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pendingHomework, setPendingHomework] = useState<any[]>([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      if (parsedUser.children?.length > 0) {
        const savedChildId = localStorage.getItem('selectedChildId')
        let childToSelect = parsedUser.children[0]

        if (savedChildId) {
          const savedChild = parsedUser.children.find(
            (child: any) => child.id.toString() === savedChildId,
          )
          if (savedChild) childToSelect = savedChild
        }

        setSelectedChild(childToSelect)
        fetchChildStats(childToSelect.id)
      }
    } catch {
      router.push('/login')
    }
  }, [router])

  const fetchChildStats = async (studentId: number) => {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const response = await fetch(`/api/dashboard/stats?studentId=${studentId}`, { headers })
      const data = await response.json()
      if (data.success) setStats(data.data)

      const homeworkResponse = await fetch(`/api/homework?studentId=${studentId}`, { headers })
      const homeworkData = await homeworkResponse.json()
      if (homeworkData.success) {
        setPendingHomework(
          homeworkData.data.filter((hw: any) => hw.submission_status === 'pending'),
        )
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChildChange = (child: any) => {
    setSelectedChild(child)
    localStorage.setItem('selectedChildId', child.id.toString())
    window.dispatchEvent(
      new CustomEvent('childSelected', { detail: { childId: child.id.toString() } }),
    )
    fetchChildStats(child.id)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      {/* Page header */}
      <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 leading-tight">
            <div>
              <p className="text-blue-100 text-xs font-medium">{getGreeting()}</p>
              <h1 className="text-lg sm:text-xl font-bold">Parent Dashboard</h1>
            </div>
            <p className="text-blue-100/90 text-xs flex items-center gap-1.5 sm:justify-end">
              <FiClock className="w-3.5 h-3.5 flex-shrink-0" />
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* My Children */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">My Children</h2>
            <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
              {user.children?.length || 0} linked
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {user.children?.map((child: any) => {
              const isSelected = selectedChild?.id === child.id
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handleChildChange(child)}
                  className={`group text-left bg-white rounded-2xl p-5 border-2 transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 shadow-md ring-4 ring-blue-100'
                      : 'border-slate-200 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden ${
                          isSelected ? 'bg-blue-100' : 'bg-slate-100'
                        }`}
                      >
                        {child.photo_url ? (
                          <img
                            src={child.photo_url}
                            alt={`${child.first_name} ${child.last_name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiUser
                            className={`w-7 h-7 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
                          />
                        )}
                      </div>
                      {isSelected && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                          <FiCheck className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {child.first_name} {child.last_name}
                      </h3>
                      <p className="text-sm text-slate-600 truncate">
                        {child.class_name}
                        {child.section_name ? ` · ${child.section_name}` : ''}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Roll {child.roll_number || 'N/A'} · {child.admission_number}
                      </p>
                    </div>
                    <FiChevronRight
                      className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
                        isSelected ? 'text-blue-600' : 'text-slate-300'
                      }`}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {selectedChild && (
          <>
            {/* Quick Overview */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Overview — {selectedChild.first_name}
              </h2>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-2xl h-[7.5rem] animate-pulse border border-slate-100" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
                  <OverviewStatCard
                    title="Attendance This Month"
                    value={stats?.attendance?.percentage || '0%'}
                    icon={FiCalendar}
                    color="green"
                    trend={stats?.attendance?.trend}
                    onClick={() => router.push(`/attendance/${selectedChild.id}`)}
                  />
                  <OverviewStatCard
                    title="Pending Fees"
                    value={formatCurrency(stats?.fees?.pending || 0)}
                    icon={RupeeIcon}
                    color="red"
                    onClick={() => router.push(`/fees/${selectedChild.id}`)}
                  />
                  <OverviewStatCard
                    title="Pending Homework"
                    value={stats?.homework?.pending || 0}
                    icon={FiBook}
                    color="yellow"
                    onClick={() => router.push(`/homework/${selectedChild.id}`)}
                  />
                  <OverviewStatCard
                    title="Overall Grade"
                    value={stats?.grades?.overall || 'N/A'}
                    icon={FiAward}
                    color="purple"
                    onClick={() => router.push(`/grades/${selectedChild.id}`)}
                  />
                </div>
              )}
            </section>

            {/* Pending Homework */}
            {pendingHomework.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Pending Homework</h2>
                  <button
                    type="button"
                    onClick={() => router.push(`/homework/${selectedChild.id}`)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View all <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingHomework.slice(0, 4).map((hw: any) => (
                    <HomeworkCard
                      key={hw.id}
                      homework={hw}
                      studentId={selectedChild.id}
                      onSubmit={() => fetchChildStats(selectedChild.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Quick Actions */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <QuickActionCard
                  title="View Report Card"
                  description="Check academic performance and grades"
                  icon={FiFileText}
                  color="blue"
                  onClick={() => router.push(`/grades/${selectedChild.id}`)}
                />
                <QuickActionCard
                  title="Pay Fees"
                  description="View and pay pending fees online"
                  icon={RupeeIcon}
                  color="green"
                  onClick={() => router.push(`/fees/${selectedChild.id}`)}
                />
                <QuickActionCard
                  title="View Attendance"
                  description="Check daily attendance records"
                  icon={FiCalendar}
                  color="purple"
                  onClick={() => router.push(`/attendance/${selectedChild.id}`)}
                />
                <QuickActionCard
                  title="Homework"
                  description="View and submit homework assignments"
                  icon={FiBook}
                  color="yellow"
                  onClick={() => router.push(`/homework/${selectedChild.id}`)}
                />
                <QuickActionCard
                  title="Join Online Classes"
                  description="Access live class sessions"
                  icon={FiVideo}
                  color="red"
                  onClick={() => alert('Online classes feature coming soon!')}
                />
                <QuickActionCard
                  title="Download Documents"
                  description="Access receipts and reports"
                  icon={FiFileText}
                  color="indigo"
                  onClick={() => router.push(`/profile/${selectedChild.id}?tab=documents`)}
                />
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {stats?.recentActivity?.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {stats.recentActivity.map((activity: any, index: number) => (
                      <ActivityItem
                        key={index}
                        {...activity}
                        icon={iconMap[activity.iconName] || FiFileText}
                        onClick={
                          activity.title?.includes('Homework')
                            ? () => router.push(`/homework/${selectedChild.id}`)
                            : activity.title?.includes('Fee')
                              ? () => router.push(`/fees/${selectedChild.id}`)
                              : activity.title?.includes('Attendance')
                                ? () => router.push(`/attendance/${selectedChild.id}`)
                                : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <FiClock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No recent activity yet</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function OverviewStatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  onClick,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: 'green' | 'red' | 'yellow' | 'purple' | 'blue'
  trend?: { value: string; isPositive: boolean }
  onClick?: () => void
}) {
  const iconStyles: Record<string, string> = {
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    blue: 'bg-blue-100 text-blue-600',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-[7.5rem] bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-left hover:-translate-y-0.5 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3 h-full">
        <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
          <p className="text-sm font-medium text-slate-600 leading-snug">{title}</p>
          <div>
            <p className="text-lg sm:text-xl font-bold text-slate-900 truncate">{value}</p>
            <p
              className={`text-xs mt-1 h-4 leading-4 ${
                trend
                  ? trend.isPositive
                    ? 'text-green-600'
                    : 'text-red-600'
                  : 'text-transparent select-none'
              }`}
            >
              {trend ? `${trend.isPositive ? '↑' : '↓'} ${trend.value}` : '—'}
            </p>
          </div>
        </div>
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${iconStyles[color]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </button>
  )
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  color,
  onClick,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  onClick?: () => void
}) {
  const styles: Record<string, { card: string; icon: string }> = {
    blue: { card: 'hover:border-blue-200 hover:bg-blue-50/50', icon: 'bg-blue-100 text-blue-600' },
    green: { card: 'hover:border-green-200 hover:bg-green-50/50', icon: 'bg-green-100 text-green-600' },
    red: { card: 'hover:border-red-200 hover:bg-red-50/50', icon: 'bg-red-100 text-red-600' },
    yellow: { card: 'hover:border-amber-200 hover:bg-amber-50/50', icon: 'bg-amber-100 text-amber-600' },
    purple: { card: 'hover:border-purple-200 hover:bg-purple-50/50', icon: 'bg-purple-100 text-purple-600' },
    indigo: { card: 'hover:border-indigo-200 hover:bg-indigo-50/50', icon: 'bg-indigo-100 text-indigo-600' },
  }

  const style = styles[color] || styles.blue

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white border border-slate-200 rounded-2xl p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${style.card}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${style.icon}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </button>
  )
}

function ActivityItem({
  title,
  description,
  time,
  icon: Icon,
  iconColor,
  iconBg,
  onClick,
}: {
  title: string
  description: string
  time: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  iconBg: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`w-full text-left p-4 flex items-start gap-4 transition-colors ${
        onClick ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-slate-900">{title}</h4>
        <p className="text-sm text-slate-600 mt-0.5">{description}</p>
        <p className="text-xs text-slate-400 mt-1">{time}</p>
      </div>
      {onClick && <FiChevronRight className="w-4 h-4 text-slate-300 mt-1 flex-shrink-0" />}
    </button>
  )
}

function HomeworkCard({
  homework,
  studentId,
  onSubmit,
}: {
  homework: any
  studentId: number
  onSubmit: () => void
}) {
  const router = useRouter()
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submissionText, setSubmissionText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isOverdue = new Date(homework.due_date) < new Date()

  const handleSubmit = async () => {
    if (!submissionText.trim()) {
      alert('Please enter your homework answer')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/homework/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          submission_id: homework.submission_id,
          submission_text: submissionText,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setShowSubmitModal(false)
        setSubmissionText('')
        onSubmit()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('Failed to submit homework. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        className={`bg-white rounded-2xl border p-5 transition-shadow hover:shadow-md ${
          isOverdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{homework.title}</h3>
            <p className="text-sm text-slate-500">{homework.subject_name}</p>
          </div>
          {isOverdue && (
            <span className="flex-shrink-0 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              Overdue
            </span>
          )}
        </div>

        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{homework.description}</p>

        <div className="flex items-center text-xs text-slate-500 mb-4 gap-3">
          <span className="flex items-center gap-1">
            <FiCalendar className="w-3.5 h-3.5" />
            Due{' '}
            {new Date(homework.due_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {homework.total_marks && <span>{homework.total_marks} marks</span>}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(`/homework/${studentId}`)}
            className="flex-1 px-3 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-medium"
          >
            View Details
          </button>
          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium"
          >
            Submit Now
          </button>
        </div>
      </div>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Submit Homework</h3>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-5">
              <div className="mb-4 p-3 bg-slate-50 rounded-xl">
                <p className="font-medium text-slate-900">{homework.title}</p>
                <p className="text-sm text-slate-500">{homework.subject_name}</p>
              </div>

              <label className="block text-sm font-medium text-slate-700 mb-2">Your Answer *</label>
              <textarea
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                placeholder="Write your homework answer here..."
              />
              <p className="text-xs text-slate-400 mt-1">{submissionText.length} characters</p>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-sm"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !submissionText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {submitting ? 'Submitting...' : 'Submit Homework'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
