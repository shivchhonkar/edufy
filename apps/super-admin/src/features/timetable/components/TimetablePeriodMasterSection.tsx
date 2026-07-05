'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiClock, FiEdit2, FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import type { TimetablePeriod } from '@/features/timetable/types';
import {
  addMinutesToTime,
  formatDurationMinutes,
  formatTime,
  getPeriodDurationMinutes,
  getPreviousPeriodEnd,
  selectClass,
  sortPeriodsByOrder,
} from '@/features/timetable/utils';
import {
  categoryBadgeClass,
  categoryLabel,
  DEFAULT_PERIOD_CATEGORY,
  PERIOD_CATEGORIES,
  resolvePeriodCategory,
  type PeriodCategory,
} from '@/lib/period-category';
import { useDialog } from '@/shared/context/DialogContext';

interface PeriodForm {
  name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  period_category: PeriodCategory;
}

const EMPTY_PERIOD_FORM: PeriodForm = {
  name: '',
  start_time: '',
  end_time: '',
  duration_minutes: 40,
  period_category: DEFAULT_PERIOD_CATEGORY,
};

function buildPeriodForm(
  name: string,
  startTime: string,
  endTime: string,
  fallbackDuration = 40,
  periodCategory: PeriodCategory = DEFAULT_PERIOD_CATEGORY,
): PeriodForm {
  const duration =
    getPeriodDurationMinutes(startTime, endTime) ?? fallbackDuration;
  return {
    name,
    start_time: startTime,
    end_time: endTime || addMinutesToTime(startTime, duration),
    duration_minutes: duration,
    period_category: periodCategory,
  };
}

export default function TimetablePeriodMasterSection() {
  const { alert, confirm } = useDialog();
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);
  const [periodForm, setPeriodForm] = useState<PeriodForm>(EMPTY_PERIOD_FORM);
  const [linkedStartTime, setLinkedStartTime] = useState<string | null>(null);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/timetable/setup');
      const data = await res.json();
      if (data.success) setPeriods(data.data.periods);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  const syncFollowingPeriods = async (fromPeriodId?: number | null) => {
    const res = await fetch('/api/timetable/periods/sync-chain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fromPeriodId ? { from_period_id: fromPeriodId } : {}),
    });
    return res.json();
  };

  const handleStartTimeChange = (startTime: string) => {
    if (linkedStartTime) return;
    setPeriodForm((prev) => {
      const duration = prev.duration_minutes || 40;
      return {
        ...prev,
        start_time: startTime,
        end_time: startTime ? addMinutesToTime(startTime, duration) : prev.end_time,
      };
    });
  };

  const handleEndTimeChange = (endTime: string) => {
    setPeriodForm((prev) => {
      const startTime = linkedStartTime || prev.start_time;
      const duration = getPeriodDurationMinutes(startTime, endTime);
      return {
        ...prev,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration ?? prev.duration_minutes,
      };
    });
  };

  const handleDurationChange = (rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    const duration = Number.isNaN(parsed) ? 0 : Math.max(1, Math.min(240, parsed));
    setPeriodForm((prev) => {
      const startTime = linkedStartTime || prev.start_time;
      return {
        ...prev,
        start_time: startTime,
        duration_minutes: duration,
        end_time:
          startTime && duration > 0 ? addMinutesToTime(startTime, duration) : prev.end_time,
      };
    });
  };

  const openAddPeriod = () => {
    const sorted = sortPeriodsByOrder(periods);
    const last = sorted[sorted.length - 1];
    const lastStart = last?.start_time ? formatTime(last.start_time) : '';
    const lastEnd = last?.end_time ? formatTime(last.end_time) : '';
    const lastDuration =
      lastStart && lastEnd ? getPeriodDurationMinutes(lastStart, lastEnd) ?? 40 : 40;
    const linkedStart = getPreviousPeriodEnd(periods, null) || '08:00';

    setEditingPeriodId(null);
    setLinkedStartTime(last ? linkedStart : null);
    setPeriodForm(
      buildPeriodForm(
        `P${sorted.filter((p) => resolvePeriodCategory(p) === 'study').length + 1}`,
        linkedStart,
        addMinutesToTime(linkedStart, lastDuration),
        lastDuration,
      ),
    );
    setShowPeriodForm(true);
  };

  const savePeriod = async () => {
    if (!periodForm.name.trim()) {
      await alert('Enter a period name', { title: 'Required', type: 'warning' });
      return;
    }
    if (!periodForm.start_time || !periodForm.end_time) {
      await alert('Start and end time are required', { title: 'Required', type: 'warning' });
      return;
    }
    const duration = getPeriodDurationMinutes(periodForm.start_time, periodForm.end_time);
    if (!duration) {
      await alert('End time must be after start time', { title: 'Invalid time', type: 'warning' });
      return;
    }

    const isEdit = editingPeriodId != null;
    const saveStart = linkedStartTime || periodForm.start_time;
    const res = await fetch(
      isEdit ? `/api/timetable/periods/${editingPeriodId}` : '/api/timetable/periods',
      {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: periodForm.name.trim(),
          start_time: saveStart || null,
          end_time: periodForm.end_time || null,
          period_category: periodForm.period_category,
        }),
      },
    );
    const data = await res.json();
    if (data.success) {
      const savedPeriodId = isEdit ? editingPeriodId : (data.data?.id as number | undefined);
      const syncData = await syncFollowingPeriods(savedPeriodId ?? null);

      setShowPeriodForm(false);
      setEditingPeriodId(null);
      setLinkedStartTime(null);
      setPeriodForm(EMPTY_PERIOD_FORM);
      await loadPeriods();

      if (syncData.success && syncData.data?.updated_count > 0) {
        await alert(
          `${isEdit ? 'Period updated' : 'Period added'}. ${syncData.data.updated_count} following period(s) adjusted automatically.`,
          { title: 'Success', type: 'success' },
        );
      } else {
        await alert(isEdit ? 'Period updated' : 'Period added', { title: 'Success', type: 'success' });
      }
    } else {
      await alert(data.error || 'Failed to save period', { title: 'Error', type: 'error' });
    }
  };

  const handleSyncChain = async () => {
    const syncData = await syncFollowingPeriods(null);
    if (syncData.success) {
      await loadPeriods();
      if (syncData.data?.updated_count > 0) {
        await alert(
          `Bell schedule synced. ${syncData.data.updated_count} period(s) updated.`,
          { title: 'Synced', type: 'success' },
        );
      } else {
        await alert('All periods are already linked correctly.', { title: 'In sync', type: 'success' });
      }
    } else {
      await alert(syncData.error || 'Failed to sync schedule', { title: 'Error', type: 'error' });
    }
  };

  const removePeriod = async (period: TimetablePeriod) => {
    const ok = await confirm(`Remove "${period.name}"?`, { title: 'Remove period', type: 'warning' });
    if (!ok) return;
    const res = await fetch(`/api/timetable/periods/${period.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await syncFollowingPeriods(null);
      await loadPeriods();
    } else {
      await alert(data.error || 'Failed to remove', { title: 'Error', type: 'error' });
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 py-4 text-center">Loading period master...</div>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 text-sm text-blue-800">
        <div>
          <h2 className="font-medium flex items-center gap-2">
            <FiClock className="text-primary-600" />
            Step 2 — Period Master
          </h2>
          <p className="text-xs mt-0.5 text-blue-700">
            School-wide bell schedule. Lunch periods cannot be scheduled in the builder.
          </p>
        </div>
        <div className="flex gap-2 rounded-xl px-4 py-3 text-sm text-blue-800">
          <button
            type="button"
            onClick={handleSyncChain}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Sync schedule
          </button>
          <button
            type="button"
            onClick={loadPeriods}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={openAddPeriod}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            <FiPlus className="w-4 h-4" />
            Add period
          </button>
        </div>
      </div>

      {showPeriodForm && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
          <p className="text-sm font-medium text-gray-700">
            {editingPeriodId ? 'Edit period' : 'New period'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                placeholder="Period name"
                value={periodForm.name}
                onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                className={selectClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={periodForm.period_category}
                onChange={(e) =>
                  setPeriodForm({
                    ...periodForm,
                    period_category: e.target.value as PeriodCategory,
                  })
                }
                className={selectClass}
              >
                {PERIOD_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start time</label>
              <input
                type="time"
                value={periodForm.start_time}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                readOnly={!!linkedStartTime}
                className={`${selectClass} ${linkedStartTime ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
              />
              {linkedStartTime && (
                <p className="text-[10px] text-gray-500 mt-1">Linked to previous period end</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (min)</label>
              <input
                type="number"
                min={1}
                max={240}
                value={periodForm.duration_minutes || ''}
                onChange={(e) => handleDurationChange(e.target.value)}
                className={selectClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End time</label>
              <input
                type="time"
                value={periodForm.end_time}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className={selectClass}
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={savePeriod}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                {editingPeriodId ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPeriodForm(false);
                  setEditingPeriodId(null);
                  setLinkedStartTime(null);
                  setPeriodForm(EMPTY_PERIOD_FORM);
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            Period 2 onward starts from the previous period&apos;s end time. Changing duration or end time
            recalculates following periods after save.
          </p>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Period</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Category</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {periods.map((period) => {
              const category = resolvePeriodCategory(period);
              const rowClass =
                category === 'lunch'
                  ? 'bg-amber-50/60'
                  : category === 'activity'
                    ? 'bg-violet-50/40'
                    : '';
              const start = formatTime(period.start_time);
              const end = formatTime(period.end_time);
              const duration = getPeriodDurationMinutes(start, end);
              return (
                <tr key={period.id} className={rowClass}>
                  <td className="px-4 py-3 font-medium">{period.name}</td>
                  <td className="px-4 py-3">
                    {start || '—'}
                    {end ? ` – ${end}` : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">
                    {formatDurationMinutes(duration)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${categoryBadgeClass(category)}`}
                    >
                      {categoryLabel(category)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const previousEnd = getPreviousPeriodEnd(periods, period.id);
                          const start = formatTime(period.start_time);
                          const end = formatTime(period.end_time);
                          const duration = getPeriodDurationMinutes(start, end) ?? 40;
                          const linkedStart = previousEnd;
                          setEditingPeriodId(period.id);
                          setLinkedStartTime(linkedStart);
                          setPeriodForm(
                            buildPeriodForm(
                              period.name,
                              linkedStart || start,
                              linkedStart
                                ? addMinutesToTime(linkedStart, duration)
                                : end,
                              duration,
                              category,
                            ),
                          );
                          setShowPeriodForm(true);
                        }}
                        className="p-2 text-gray-500 hover:text-primary-600 rounded hover:bg-gray-100"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePeriod(period)}
                        className="p-2 text-gray-500 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
