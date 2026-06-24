'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi';
import { getCalendarDateString } from '@edulakhya/utils';
import type {
  AcademicCalendarCategory,
  AcademicCalendarEntry,
} from '@/lib/academic-calendar';
import AddAcademicCalendarModal from '@/features/academics/components/AddAcademicCalendarModal';
import AcademicCalendarEntryRow, {
  entryColorClass,
} from '@/features/academics/components/AcademicCalendarEntryRow';
import { useDialog } from '@/shared/context/DialogContext';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TABS: { id: AcademicCalendarCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'holiday', label: 'Holidays' },
  { id: 'exam', label: 'Exams' },
  { id: 'ptm', label: 'PTMs' },
  { id: 'event', label: 'Events' },
  { id: 'term_date', label: 'Term Dates' },
];

function entryOverlapsDate(entry: AcademicCalendarEntry, date: string): boolean {
  return entry.start_date <= date && entry.end_date >= date;
}

export default function AcademicCalendarView() {
  const { confirm } = useDialog();
  const today = new Date();
  const [activeTab, setActiveTab] = useState<AcademicCalendarCategory>('all');
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [monthEntries, setMonthEntries] = useState<AcademicCalendarEntry[]>([]);
  const [allEntries, setAllEntries] = useState<AcademicCalendarEntry[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<AcademicCalendarEntry | null>(null);
  const [modalCategory, setModalCategory] = useState<Exclude<AcademicCalendarCategory, 'all'>>('holiday');

  const loadMonthEntries = useCallback(async () => {
    setLoadingMonth(true);
    try {
      const response = await fetch(
        `/api/academics/academic-calendar?category=${activeTab}&year=${viewYear}&month=${viewMonth}`,
      );
      const data = await response.json();
      setMonthEntries(data.success ? data.data : []);
    } catch {
      setMonthEntries([]);
    } finally {
      setLoadingMonth(false);
    }
  }, [activeTab, viewYear, viewMonth]);

  const loadAllEntries = useCallback(async () => {
    setLoadingAll(true);
    try {
      const response = await fetch(`/api/academics/academic-calendar?category=${activeTab}`);
      const data = await response.json();
      setAllEntries(data.success ? data.data : []);
    } catch {
      setAllEntries([]);
    } finally {
      setLoadingAll(false);
    }
  }, [activeTab]);

  const refreshEntries = useCallback(async () => {
    await Promise.all([loadMonthEntries(), loadAllEntries()]);
  }, [loadMonthEntries, loadAllEntries]);

  useEffect(() => {
    loadMonthEntries();
  }, [loadMonthEntries]);

  useEffect(() => {
    loadAllEntries();
  }, [loadAllEntries]);

  const monthLabel = useMemo(
    () =>
      new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      }),
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
    const map = new Map<string, AcademicCalendarEntry[]>();

    const toLocalDateKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    for (const entry of monthEntries) {
      const start = new Date(`${entry.start_date}T12:00:00`);
      const end = new Date(`${entry.end_date}T12:00:00`);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toLocalDateKey(d);
        const list = map.get(key) || [];
        if (!list.some((item) => item.source_kind === entry.source_kind && item.id === entry.id)) {
          list.push(entry);
        }
        map.set(key, list);
      }
    }
    return map;
  }, [monthEntries]);

  const todayKey = getCalendarDateString();
  const selectedEntries = useMemo(
    () =>
      selectedDate ? allEntries.filter((entry) => entryOverlapsDate(entry, selectedDate)) : [],
    [selectedDate, allEntries],
  );

  const sortedEntries = useMemo(
    () =>
      [...allEntries].sort((a, b) => {
        const dateCompare = a.start_date.localeCompare(b.start_date);
        if (dateCompare !== 0) return dateCompare;
        return a.title.localeCompare(b.title);
      }),
    [allEntries],
  );

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth() + 1);
    setSelectedDate(null);
  };

  const defaultCategoryForTab = (
    tab: AcademicCalendarCategory,
  ): Exclude<AcademicCalendarCategory, 'all'> => {
    if (tab === 'all') return 'holiday';
    return tab;
  };

  const openCreate = (date?: string) => {
    setEditEntry(null);
    setModalCategory(defaultCategoryForTab(activeTab));
    setSelectedDate(date || null);
    setModalOpen(true);
  };

  const openEdit = (entry: AcademicCalendarEntry) => {
    setEditEntry(entry);
    setModalCategory(entry.category);
    setModalOpen(true);
  };

  const handleDelete = async (entry: AcademicCalendarEntry) => {
    const confirmed = await confirm(`Delete "${entry.title}"?`, {
      title: 'Delete entry',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/academics/academic-calendar/${entry.id}?source_kind=${entry.source_kind}`,
        { method: 'DELETE' },
      );
      const data = await response.json();
      if (data.success) refreshEntries();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedDate(null);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
            aria-label="Previous month"
          >
            <FiChevronLeft />
          </button>
          <h2 className="min-w-[10rem] text-center text-lg font-semibold text-gray-900">{monthLabel}</h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
            aria-label="Next month"
          >
            <FiChevronRight />
          </button>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          <FiPlus />
          Add {activeTab === 'all' ? 'Entry' : TABS.find((t) => t.id === activeTab)?.label.slice(0, -1) || 'Entry'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-gray-500">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarCells.map((cell, index) => {
              if (!cell.date || !cell.day) {
                return <div key={`empty-${index}`} className="min-h-[6.5rem] border-b border-r bg-gray-50/40" />;
              }

              const dayEntries = eventsByDate.get(cell.date) || [];
              const isToday = cell.date === todayKey;
              const isSelected = cell.date === selectedDate;

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDate(cell.date!)}
                  onDoubleClick={() => openCreate(cell.date!)}
                  className={`min-h-[6.5rem] border-b border-r p-2 text-left transition-colors ${
                    isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                      isToday ? 'bg-primary-600 font-semibold text-white' : 'text-gray-800'
                    }`}
                  >
                    {cell.day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {loadingMonth ? (
                      <div className="h-4 animate-pulse rounded bg-gray-100" />
                    ) : (
                      dayEntries.slice(0, 2).map((entry) => (
                        <div
                          key={`${entry.source_kind}-${entry.id}-${cell.date}`}
                          className={`truncate rounded border px-1.5 py-0.5 text-[10px] ${entryColorClass(entry.category)}`}
                        >
                          {entry.title}
                        </div>
                      ))
                    )}
                    {dayEntries.length > 2 && (
                      <p className="text-[10px] text-gray-500">+{dayEntries.length - 2} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-[28rem] flex-col rounded-xl border bg-white p-5 shadow-sm lg:max-h-[calc(100vh-9rem)]">
          <div className="mb-4 shrink-0">
            <h3 className="font-semibold text-gray-900">
              {selectedDate
                ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'All Entries'}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {loadingAll ? 'Loading…' : `${allEntries.length} entries in ${TABS.find((t) => t.id === activeTab)?.label}`}
            </p>
          </div>

          <div className="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
            {loadingAll ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : (selectedDate ? selectedEntries : sortedEntries).length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {(selectedDate ? selectedEntries : sortedEntries).map((entry) => (
                  <AcademicCalendarEntryRow
                    key={`${entry.source_kind}-${entry.id}`}
                    entry={entry}
                    highlighted={selectedDate ? entryOverlapsDate(entry, selectedDate) : false}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-gray-200 px-4 text-center">
                <div>
                  <p className="text-sm font-medium text-gray-700">No entries yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add holidays, exams, PTMs, events, or term dates for this academic year.
                  </p>
                  <button
                    type="button"
                    onClick={() => openCreate(selectedDate ?? undefined)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    <FiPlus size={14} /> Add entry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddAcademicCalendarModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditEntry(null);
        }}
        onSuccess={refreshEntries}
        category={modalCategory}
        allowCategorySelect={activeTab === 'all' && !editEntry}
        initialDate={selectedDate || undefined}
        editEntry={editEntry}
      />
    </div>
  );
}
