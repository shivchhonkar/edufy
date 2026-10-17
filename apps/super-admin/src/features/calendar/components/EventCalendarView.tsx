'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi';
import { getCalendarDateString } from '@edulakhya/utils';
import type { CalendarEvent } from '@/lib/school-calendar';
import AddCalendarEventModal from './AddCalendarEventModal';
import CalendarEventListRow from './CalendarEventListRow';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function eventColor(event: CalendarEvent): string {
  if (event.kind === 'holiday') return 'bg-rose-100 text-rose-800 border-rose-200';
  switch (event.event_type) {
    case 'exam':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'meeting':
    case 'ptm':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'sports':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-primary-50 text-primary-800 border-primary-200';
  }
}

function formatDisplayDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function eventOverlapsDate(event: CalendarEvent, date: string): boolean {
  return event.start_date <= date && event.end_date >= date;
}

export default function EventCalendarView() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([]);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  const loadMonthEvents = useCallback(async () => {
    setLoadingMonth(true);
    try {
      const response = await fetch(
        `/api/calendar/events?year=${viewYear}&month=${viewMonth}`,
      );
      const data = await response.json();
      if (data.success) setMonthEvents(data.data);
      else setMonthEvents([]);
    } catch {
      setMonthEvents([]);
    } finally {
      setLoadingMonth(false);
    }
  }, [viewYear, viewMonth]);

  const loadAllEvents = useCallback(async () => {
    setLoadingAll(true);
    try {
      const response = await fetch('/api/calendar/events?scope=all');
      const data = await response.json();
      if (data.success) setAllEvents(data.data);
      else setAllEvents([]);
    } catch {
      setAllEvents([]);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    await Promise.all([loadMonthEvents(), loadAllEvents()]);
  }, [loadMonthEvents, loadAllEvents]);

  useEffect(() => {
    loadMonthEvents();
  }, [loadMonthEvents]);

  useEffect(() => {
    loadAllEvents();
  }, [loadAllEvents]);

  const monthLabel = useMemo(
    () => new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    [viewYear, viewMonth],
  );

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const startOffset = firstDay.getDay();
    const cells: Array<{ date: string | null; day: number | null }> = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push({ date: null, day: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ date, day });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, day: null });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    const toLocalDateKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    for (const event of monthEvents) {
      const start = new Date(`${event.start_date}T12:00:00`);
      const end = new Date(`${event.end_date}T12:00:00`);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toLocalDateKey(d);
        const list = map.get(key) || [];
        if (!list.some((item) => item.kind === event.kind && item.id === event.id)) {
          list.push(event);
        }
        map.set(key, list);
      }
    }
    return map;
  }, [monthEvents]);

  const todayKey = getCalendarDateString();

  const selectedEvents = useMemo(
    () =>
      selectedDate
        ? allEvents.filter((event) => eventOverlapsDate(event, selectedDate))
        : [],
    [selectedDate, allEvents],
  );

  const todayEvents = useMemo(
    () => allEvents.filter((event) => eventOverlapsDate(event, todayKey)),
    [allEvents, todayKey],
  );

  const sortedAllEvents = useMemo(
    () =>
      [...allEvents].sort((a, b) => {
        const dateCompare = a.start_date.localeCompare(b.start_date);
        if (dateCompare !== 0) return dateCompare;
        return a.title.localeCompare(b.title);
      }),
    [allEvents],
  );

  const monthEventsInView = useMemo(
    () =>
      monthEvents.filter((event) => {
        const monthStart = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(viewYear, viewMonth, 0).getDate();
        const monthEnd = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return event.start_date <= monthEnd && event.end_date >= monthStart;
      }),
    [monthEvents, viewYear, viewMonth],
  );

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth() + 1);
    setSelectedDate(null);
  };

  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
    setSelectedDate(todayKey);
  };

  const isViewingCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;

  const listedEvents = selectedDate
    ? sortedAllEvents.filter((event) => eventOverlapsDate(event, selectedDate))
    : sortedAllEvents;

  const openCreate = (date?: string) => {
    setEditEvent(null);
    setSelectedDate(date || null);
    setModalOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditEvent(event);
    setModalOpen(true);
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!confirm(`Delete "${event.title}"?`)) return;
    try {
      const response = await fetch(`/api/calendar/events/${event.id}?kind=${event.kind}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) refreshEvents();
      else alert(data.error || 'Failed to delete');
    } catch {
      alert('Failed to delete entry');
    }
  };

  const navButtonClass =
    'inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Event Calendar</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            School events and holidays for parents and staff.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate(selectedDate || undefined)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs text-white hover:bg-primary-700"
        >
          <FiPlus size={14} />
          Add Event / Holiday
        </button>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.9fr)]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => shiftMonth(-1)} className={navButtonClass} aria-label="Previous month">
                <FiChevronLeft size={16} />
              </button>
              <h2 className="min-w-[9.5rem] text-center text-sm font-semibold text-gray-900">{monthLabel}</h2>
              <button type="button" onClick={() => shiftMonth(1)} className={navButtonClass} aria-label="Next month">
                <FiChevronRight size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={goToToday}
              className={`rounded-md border px-2.5 py-1.5 text-xs ${
                isViewingCurrentMonth && selectedDate === todayKey
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Today
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200 p-px">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="bg-gray-50 px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500"
              >
                {day}
              </div>
            ))}
            {calendarCells.map((cell, index) => {
              if (!cell.date || !cell.day) {
                return <div key={`empty-${index}`} className="min-h-[6.75rem] bg-gray-50" />;
              }

              const dayEvents = eventsByDate.get(cell.date) || [];
              const isToday = cell.date === todayKey;
              const isSelected = cell.date === selectedDate;
              const isWeekend = index % 7 === 0 || index % 7 === 6;

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDate((current) => (current === cell.date ? null : cell.date))}
                  onDoubleClick={() => openCreate(cell.date)}
                  className={`flex min-h-[6.75rem] flex-col p-1.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-primary-50 ring-1 ring-inset ring-primary-300'
                      : isWeekend
                        ? 'bg-gray-50/80 hover:bg-gray-50'
                        : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday ? 'bg-primary-600 font-semibold text-white' : 'text-gray-800'
                    }`}
                  >
                    {cell.day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {loadingMonth
                      ? null
                      : dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={`${event.kind}-${event.id}-${cell.date}`}
                            className={`truncate rounded-md border px-1.5 py-0.5 text-[11px] leading-4 ${eventColor(event)} ${event.status === 'cancelled' ? 'line-through opacity-70' : ''}`}
                            title={event.status === 'cancelled' ? `${event.title} (cancelled)` : event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                    {!loadingMonth && dayEvents.length > 2 && (
                      <p className="px-1 text-[11px] text-gray-500">+{dayEvents.length - 2} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-200 px-3 py-2 text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary-500" /> Event
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> PTM
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Exam
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Sports
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Holiday
            </span>
          </div>
        </div>

        <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:max-h-[calc(100vh-7.5rem)]">
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Today</h3>
              <p className="text-xs text-gray-500">{formatDisplayDate(todayKey)}</p>
            </div>
            {loadingAll ? (
              <div className="mt-3 h-14 animate-pulse rounded-lg bg-gray-100" />
            ) : todayEvents.length > 0 ? (
              <ul className="mt-2 divide-y divide-gray-100">
                {todayEvents.map((event, index) => (
                  <CalendarEventListRow
                    key={`today-${event.kind}-${event.id}`}
                    event={event}
                    index={index}
                    compact
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-gray-200 px-3 py-3 text-center text-xs text-gray-500">
                Nothing scheduled for today.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">
                {selectedDate ? 'Selected day' : 'All events'}
              </h3>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {loadingAll
                  ? 'Loading…'
                  : selectedDate
                    ? `${formatDisplayDate(selectedDate)} · ${selectedEvents.length} ${selectedEvents.length === 1 ? 'entry' : 'entries'}`
                    : `${allEvents.length} ${allEvents.length === 1 ? 'entry' : 'entries'} · ${monthEventsInView.length} in ${monthLabel}`}
              </p>
            </div>
            {selectedDate ? (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => openCreate(selectedDate)}
                  className="text-xs font-medium text-primary-700 hover:text-primary-800"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  Show all
                </button>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
            {loadingAll ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : listedEvents.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {listedEvents.map((event, index) => {
                  const isInViewedMonth = monthEventsInView.some(
                    (item) => item.kind === event.kind && item.id === event.id,
                  );
                  return (
                    <CalendarEventListRow
                      key={`${event.kind}-${event.id}`}
                      event={event}
                      index={index}
                      muted={!selectedDate && !isInViewedMonth}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </ul>
            ) : (
              <div className="flex h-full min-h-[12rem] items-center justify-center px-4 text-center">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {selectedDate ? 'Nothing on this date' : 'No events or holidays yet'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedDate
                      ? 'Add an event or holiday for this day.'
                      : 'Create the first entry for the school calendar.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => openCreate(selectedDate || undefined)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    <FiPlus size={14} /> Add entry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddCalendarEventModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditEvent(null);
        }}
        onSuccess={refreshEvents}
        initialDate={selectedDate || undefined}
        editEvent={editEvent}
      />
    </div>
  );
}
