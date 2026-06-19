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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            aria-label="Previous month"
          >
            <FiChevronLeft />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 min-w-[10rem] text-center">{monthLabel}</h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            aria-label="Next month"
          >
            <FiChevronRight />
          </button>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <FiPlus /> Add Event / Holiday
        </button>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-3 text-xs font-semibold text-gray-500 text-center">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarCells.map((cell, index) => {
              if (!cell.date || !cell.day) {
                return <div key={`empty-${index}`} className="min-h-[6.5rem] border-b border-r bg-gray-50/40" />;
              }

              const dayEvents = eventsByDate.get(cell.date) || [];
              const isToday = cell.date === todayKey;
              const isSelected = cell.date === selectedDate;

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDate(cell.date)}
                  onDoubleClick={() => openCreate(cell.date)}
                  className={`min-h-[6.5rem] border-b border-r p-2 text-left transition-colors ${
                    isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                      isToday ? 'bg-primary-600 text-white font-semibold' : 'text-gray-800'
                    }`}
                  >
                    {cell.day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={`${event.kind}-${event.id}-${cell.date}`}
                        className={`truncate rounded px-1.5 py-0.5 text-[10px] border ${eventColor(event)}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[10px] text-gray-500">+{dayEvents.length - 2} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm p-5 flex flex-col min-h-[28rem] lg:max-h-[calc(100vh-9rem)]">
          <div className="shrink-0 space-y-4 mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Today&apos;s Events</h3>
              <p className="text-xs text-gray-500 mt-0.5">{formatDisplayDate(todayKey)}</p>
            </div>

            {loadingAll ? (
              <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ) : todayEvents.length > 0 ? (
              <ul className="divide-y divide-gray-100 max-h-52 overflow-y-auto -mx-1">
                {todayEvents.map((event, index) => (
                  <CalendarEventListRow
                    key={`today-${event.kind}-${event.id}`}
                    event={event}
                    index={index}
                    highlighted
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center">
                No events or holidays scheduled for today.
              </p>
            )}

            <div className="pt-3 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900">All Events & Holidays</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {loadingAll ? '…' : `${allEvents.length} total ${allEvents.length === 1 ? 'entry' : 'entries'}`}
                {!loadingMonth && (
                  <span className="normal-case font-normal text-gray-400">
                    {' '}
                    · {monthEventsInView.length} in {monthLabel}
                  </span>
                )}
              </p>
              {selectedDate ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-primary-50 px-3 py-2">
                  <p className="text-sm text-primary-900">
                    <span className="font-medium">{formatDisplayDate(selectedDate)}</span>
                    <span className="text-primary-700">
                      {' '}
                      · {selectedEvents.length} {selectedEvents.length === 1 ? 'entry' : 'entries'} this day
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => openCreate(selectedDate)}
                    className="text-xs text-primary-700 hover:text-primary-800 font-medium shrink-0"
                  >
                    Add on this day
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Every event and holiday across all months. Click a date on the calendar to highlight its entries.
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
            {loadingAll ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : sortedAllEvents.length > 0 ? (
              <ul className="divide-y divide-gray-100 pb-1 -mx-1">
                {sortedAllEvents.map((event, index) => {
                  const isHighlighted = selectedDate ? eventOverlapsDate(event, selectedDate) : false;
                  const isInViewedMonth = monthEventsInView.some(
                    (item) => item.kind === event.kind && item.id === event.id,
                  );
                  return (
                    <CalendarEventListRow
                      key={`${event.kind}-${event.id}`}
                      event={event}
                      index={index}
                      highlighted={isHighlighted}
                      muted={!isInViewedMonth && !isHighlighted}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </ul>
            ) : (
              <div className="flex h-full min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-gray-200 px-4 text-center">
                <div>
                  <p className="text-sm font-medium text-gray-700">No events or holidays yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Use &quot;Add Event / Holiday&quot; to create your first entry.
                  </p>
                  <button
                    type="button"
                    onClick={() => openCreate()}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
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
