'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiCalendar } from 'react-icons/fi'
import ParentCalendarView from '@/features/calendar/ParentCalendarView'

export default function CalendarPage() {
  const router = useRouter()

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="portal-page min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6 py-5 sm:py-7">
        <header className="portal-page-header rounded-2xl px-4 sm:px-5 py-4 sm:py-5 mb-5 sm:mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-primary-50 text-[var(--theme-primary)]">
              <FiCalendar className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold portal-text">School Calendar</h1>
              <p className="text-sm portal-text-muted mt-0.5">
                Upcoming events, exams, and holidays published by the school.
              </p>
            </div>
          </div>
        </header>

        <ParentCalendarView />
      </div>
    </div>
  )
}
