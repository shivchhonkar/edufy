'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { getCalendarDateString } from '@edulakhya/utils'
import { getAuthHeaders } from '@/lib/parent-portal/client-auth'
import type { CalendarEvent } from '@/lib/parent-portal/school-calendar'
import ParentEventListRow from '@/features/parent-portal/calendar/components/ParentEventListRow'
import { parentApi } from '@/lib/parent-portal/constants'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function eventColor(event: CalendarEvent): string {
  if (event.kind === 'holiday') return 'bg-rose-100/90 text-rose-900 border-rose-200'
  switch (event.event_type) {
    case 'exam':
      return 'bg-amber-100/90 text-amber-900 border-amber-200'
    case 'meeting':
      return 'bg-sky-100/90 text-sky-900 border-sky-200'
    case 'sports':
      return 'bg-emerald-100/90 text-emerald-900 border-emerald-200'
    default:
      return 'bg-primary-50 text-primary-900 border-primary-200'
  }
}

function formatDisplayDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function eventOverlapsDate(event: CalendarEvent, date: string): boolean {
  return event.start_date <= date && event.end_date >= date
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function ParentCalendarView() {
  const todayKey = getCalendarDateString()
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1)
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([])
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([])
  const [loadingMonth, setLoadingMonth] = useState(true)
  const [loadingAll, setLoadingAll] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const loadMonthEvents = useCallback(async () => {
    setLoadingMonth(true)
    try {
      const response = await fetch(parentApi(`/calendar/events?year=${viewYear}&month=${viewMonth}`), {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (data.success) setMonthEvents(data.data)
      else setMonthEvents([])
    } catch {
      setMonthEvents([])
    } finally {
      setLoadingMonth(false)
    }
  }, [viewYear, viewMonth])

  const loadAllEvents = useCallback(async () => {
    setLoadingAll(true)
    try {
      const response = await fetch(parentApi('/calendar/events?scope=all'), {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (data.success) setAllEvents(data.data)
      else setAllEvents([])
    } catch {
      setAllEvents([])
    } finally {
      setLoadingAll(false)
    }
  }, [])

  useEffect(() => {
    loadMonthEvents()
  }, [loadMonthEvents])

  useEffect(() => {
    loadAllEvents()
  }, [loadAllEvents])

  const monthLabel = useMemo(
    () =>
      new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      }),
    [viewYear, viewMonth],
  )

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1)
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
    const startOffset = firstDay.getDay()
    const cells: Array<{ date: string | null; day: number | null }> = []

    for (let i = 0; i < startOffset; i += 1) {
      cells.push({ date: null, day: null })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({ date, day })
    }
    return cells
  }, [viewYear, viewMonth])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of monthEvents) {
      const start = new Date(`${event.start_date}T12:00:00`)
      const end = new Date(`${event.end_date}T12:00:00`)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toLocalDateKey(d)
        const list = map.get(key) || []
        if (!list.some((item) => item.kind === event.kind && item.id === event.id)) {
          list.push(event)
        }
        map.set(key, list)
      }
    }
    return map
  }, [monthEvents])

  const todayEvents = useMemo(
    () => allEvents.filter((event) => eventOverlapsDate(event, todayKey)),
    [allEvents, todayKey],
  )

  const sortedAllEvents = useMemo(() => [...allEvents], [allEvents])

  const monthEventsInView = useMemo(() => {
    const monthStart = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`
    const lastDay = new Date(viewYear, viewMonth, 0).getDate()
    const monthEnd = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return monthEvents.filter(
      (event) => event.start_date <= monthEnd && event.end_date >= monthStart,
    )
  }, [monthEvents, viewYear, viewMonth])

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth - 1 + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth() + 1)
    setSelectedDate(null)
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="p-2 rounded-xl portal-card portal-text hover:opacity-90"
          aria-label="Previous month"
        >
          <FiChevronLeft />
        </button>
        <h2 className="text-base sm:text-lg font-semibold portal-text min-w-[10rem] text-center">
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="p-2 rounded-xl portal-card portal-text hover:opacity-90"
          aria-label="Next month"
        >
          <FiChevronRight />
        </button>
      </div>

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4 sm:gap-5">
        <div className="portal-card rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b portal-divider">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-1 sm:px-2 py-2.5 text-[10px] sm:text-xs font-semibold portal-text-muted text-center"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarCells.map((cell, index) => {
              if (!cell.date || !cell.day) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[5.5rem] sm:min-h-[6.5rem] border-b border-r portal-divider opacity-40"
                  />
                )
              }

              const dayEvents = eventsByDate.get(cell.date) || []
              const isToday = cell.date === todayKey
              const isSelected = cell.date === selectedDate

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDate(cell.date)}
                  className={`min-h-[5.5rem] sm:min-h-[6.5rem] border-b border-r portal-divider p-1.5 sm:p-2 text-left transition-colors ${
                    isSelected ? 'bg-primary-50/80' : 'hover:bg-black/[0.02]'
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs sm:text-sm ${
                      isToday
                        ? 'bg-[var(--theme-primary)] text-white font-semibold'
                        : 'portal-text'
                    }`}
                  >
                    {cell.day}
                  </span>
                  <div className="mt-1 space-y-0.5 sm:space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={`${event.kind}-${event.id}-${cell.date}`}
                        className={`truncate rounded px-1 py-0.5 text-[9px] sm:text-[10px] border ${eventColor(event)}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[9px] sm:text-[10px] portal-text-muted">
                        +{dayEvents.length - 2} more
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="portal-card rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col min-h-[20rem] lg:max-h-[calc(100vh-10rem)]">
          <div className="shrink-0 space-y-4 mb-4">
            <div>
              <h3 className="font-semibold portal-text">Today&apos;s Events</h3>
              <p className="text-xs portal-text-muted mt-0.5">{formatDisplayDate(todayKey)}</p>
            </div>

            {loadingAll ? (
              <div className="space-y-2">
                <div className="h-16 rounded-xl bg-black/5 animate-pulse" />
              </div>
            ) : todayEvents.length > 0 ? (
              <ul className="divide-y portal-divider max-h-52 overflow-y-auto -mx-1">
                {todayEvents.map((event, index) => (
                  <ParentEventListRow
                    key={`today-${event.kind}-${event.id}`}
                    event={{
                      title: event.title,
                      start_date: event.start_date,
                      start_time: event.start_time,
                      all_day: event.all_day,
                      event_type: event.event_type,
                      kind: event.kind,
                    }}
                    index={index}
                    highlighted
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm portal-text-muted rounded-xl border border-dashed portal-divider px-3 py-4 text-center">
                No events or holidays scheduled for today.
              </p>
            )}

            <div className="pt-3 border-t portal-divider">
              <h3 className="font-semibold portal-text">All Events & Holidays</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide portal-text-muted">
                {loadingAll ? '…' : `${allEvents.length} total ${allEvents.length === 1 ? 'entry' : 'entries'}`}
                {!loadingMonth && (
                  <span className="normal-case font-normal opacity-80">
                    {' '}
                    · {monthEventsInView.length} in {monthLabel}
                  </span>
                )}
              </p>
              {selectedDate && (
                <p className="mt-2 text-sm portal-text-muted">
                  Highlighting entries for{' '}
                  <span className="font-medium portal-text">{formatDisplayDate(selectedDate)}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
            {loadingAll ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 rounded-xl bg-black/5 animate-pulse" />
                ))}
              </div>
            ) : sortedAllEvents.length > 0 ? (
              <ul className="divide-y portal-divider pb-1 -mx-1">
                {sortedAllEvents.map((event, index) => {
                  const isHighlighted = selectedDate
                    ? eventOverlapsDate(event, selectedDate)
                    : false
                  const isInViewedMonth = monthEventsInView.some(
                    (item) => item.kind === event.kind && item.id === event.id,
                  )
                  return (
                    <ParentEventListRow
                      key={`${event.kind}-${event.id}`}
                      event={{
                        title: event.title,
                        start_date: event.start_date,
                        start_time: event.start_time,
                        all_day: event.all_day,
                        event_type: event.event_type,
                        kind: event.kind,
                      }}
                      index={index}
                      highlighted={isHighlighted}
                      muted={!isInViewedMonth && !isHighlighted}
                    />
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm portal-text-muted text-center py-8">
                No school events or holidays have been published yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
