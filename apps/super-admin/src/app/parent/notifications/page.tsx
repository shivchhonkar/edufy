'use client'

import { parentRoute } from '@/lib/parent-portal/constants';

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiBell, FiChevronLeft } from 'react-icons/fi'
import { getAuthHeaders } from '@/lib/parent-portal/client-auth'
import type { ParentNotification } from '@/lib/parent-notifications'

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const PRIORITY_STYLES: Record<string, string> = {
  info: 'portal-badge-done',
  warning: 'portal-badge-pending',
  urgent: 'bg-red-100 text-red-800',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<ParentNotification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    const studentId = localStorage.getItem('selectedChildId')
    if (!studentId) {
      router.push(parentRoute('/dashboard'))
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/parent/notifications?studentId=${studentId}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (data.success) setNotifications(data.data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchNotifications()
  }, [fetchNotifications, router])

  return (
    <div className="portal-page-shell min-h-full">
      <div className="portal-page-header">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <button
            type="button"
            onClick={() => router.push(parentRoute('/dashboard'))}
            className="inline-flex items-center gap-1 text-sm portal-link-accent mb-2"
          >
            <FiChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg portal-icon-chip">
              <FiBell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold portal-text">School Notifications</h1>
              <p className="text-sm portal-text-muted">Messages published by the school for parents</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-8">
        {loading ? (
          <div className="portal-card rounded-xl p-8 text-center portal-text-muted text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="portal-card rounded-xl p-10 text-center">
            <FiBell className="w-10 h-10 mx-auto portal-text-muted opacity-40 mb-3" />
            <p className="portal-text font-medium">No notifications yet</p>
            <p className="text-sm portal-text-muted mt-1">
              Published notifications from the school will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {notifications.map((item) => (
              <li key={item.id} className="portal-card rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="font-semibold portal-text leading-snug">{item.title}</h2>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                      PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.info
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>
                <p className="text-sm portal-text-muted leading-relaxed whitespace-pre-wrap">{item.message}</p>
                <p className="text-xs portal-text-muted mt-3 opacity-80">
                  {formatDate(item.published_at || item.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
