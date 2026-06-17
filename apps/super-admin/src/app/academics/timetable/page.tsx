'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import {
  FiBook, FiCalendar, FiClock, FiCopy, FiEdit2, FiInfo, FiPlus, FiTrash2,
} from 'react-icons/fi';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS = [1, 2, 3, 4, 5, 6];

interface Class { id: number; name: string; }
interface Section { id: number; name: string; }
interface Subject { id: number; name: string; }
interface Period {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  sort_order: number;
  is_active: boolean;
}
interface Staff { id: number; first_name: string; last_name: string; }
interface Entry {
  id: number;
  day_of_week: number;
  period_id: number;
  subject_id: number | null;
  staff_id: number | null;
  subject_name: string;
  teacher_name: string;
  period_name: string;
  is_inherited?: boolean;
  section_id?: number | null;
}

function formatTime(time: string | null | undefined) {
  if (!time) return '';
  return String(time).slice(0, 5);
}

function addMinutesToTime(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(mins)) return '';
  const totalMinutes = hours * 60 + mins + minutes;
  const nextHours = Math.floor(totalMinutes / 60) % 24;
  const nextMinutes = totalMinutes % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

function getPeriodDurationMinutes(startTime: string, endTime: string) {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  if ([startHours, startMinutes, endHours, endMinutes].some(Number.isNaN)) return 40;
  const duration = endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  return duration > 0 ? duration : 40;
}

function getSuggestedNewPeriodTimes(periodList: Period[]) {
  const sorted = [...periodList].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.id - b.id;
  });
  const lastPeriod = sorted[sorted.length - 1];
  if (!lastPeriod?.end_time) {
    return { start_time: '08:00', end_time: '08:40' };
  }

  const startTime = formatTime(lastPeriod.end_time);
  const lastStart = formatTime(lastPeriod.start_time);
  const lastEnd = formatTime(lastPeriod.end_time);
  const duration = lastStart && lastEnd ? getPeriodDurationMinutes(lastStart, lastEnd) : 40;

  return {
    start_time: startTime,
    end_time: addMinutesToTime(startTime, duration),
  };
}

function PeriodsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-8 rounded-lg bg-gray-200" style={{ width: `${88 + (i % 3) * 24}px` }} />
      ))}
    </div>
  );
}

function TimetableGridSkeleton({ periodCount }: { periodCount: number }) {
  const cols = Math.max(periodCount, 6);
  return (
    <div className="overflow-x-auto max-w-full space-y-3 animate-pulse">
      <div className="flex gap-3">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-40 bg-gray-200 rounded" />
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden min-w-[700px] bg-white">
        <div className="grid bg-gray-50 border-b" style={{ gridTemplateColumns: `120px repeat(${cols}, minmax(100px, 1fr))` }}>
          <div className="p-3 border-r">
            <div className="h-4 w-20 bg-gray-200 rounded mx-auto" />
          </div>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="p-3 border-r last:border-r-0 space-y-2">
              <div className="h-3 w-14 bg-gray-200 rounded mx-auto" />
              <div className="h-2 w-16 bg-gray-100 rounded mx-auto" />
            </div>
          ))}
        </div>
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="grid border-b last:border-b-0"
            style={{ gridTemplateColumns: `120px repeat(${cols}, minmax(100px, 1fr))` }}
          >
            <div className="p-3 border-r flex items-center">
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
            {Array.from({ length: cols }).map((_, i) => (
              <div key={i} className="p-2 border-r last:border-r-0">
                <div className="h-8 bg-gray-100 rounded-md mx-1" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TimetablePage() {
  const { alert, confirm } = useDialog();
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [classSubjectIds, setClassSubjectIds] = useState<number[]>([]);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [periods, setPeriods] = useState<Period[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [templateEntryCount, setTemplateEntryCount] = useState(0);
  const [editCell, setEditCell] = useState<{ day: number; periodId: number } | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editStaff, setEditStaff] = useState('');
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [periodForm, setPeriodForm] = useState({ name: '', start_time: '', end_time: '' });

  const isTemplateView = !!classId && !sectionId;

  const availableSubjects = useMemo(() => {
    if (!classId || classSubjectIds.length === 0) return subjects;
    const allowed = new Set(classSubjectIds);
    return subjects.filter((s) => allowed.has(s.id));
  }, [subjects, classSubjectIds, classId]);

  const filledTemplateSlots = useMemo(
    () => entries.filter((e) => e.subject_id != null).length,
    [entries]
  );

  const fetchPeriods = useCallback(async () => {
    setLoadingPeriods(true);
    try {
      const res = await fetch('/api/timetable/periods?active_only=false');
      const data = await res.json();
      if (data.success) setPeriods(data.data);
    } finally {
      setLoadingPeriods(false);
    }
  }, []);

  const activePeriods = useMemo(
    () => periods.filter((period) => period.is_active !== false),
    [periods],
  );

  const fetchEntries = useCallback(async () => {
    if (!classId) {
      setEntries([]);
      setClassSubjectIds([]);
      setTemplateEntryCount(0);
      setLoadingTimetable(false);
      return;
    }
    setLoadingTimetable(true);
    try {
      let url = `/api/timetable?class_id=${classId}`;
      if (sectionId) url += `&section_id=${sectionId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data.entries);
        setClassSubjectIds(data.data.class_subject_ids || []);
        if (data.data.periods?.length) setPeriods(data.data.periods);
        if (data.data.sections?.length) setSections(data.data.sections);
        setTemplateEntryCount(data.data.meta?.template_entry_count ?? 0);
      }
    } finally {
      setLoadingTimetable(false);
    }
  }, [classId, sectionId]);

  useEffect(() => {
    fetch('/api/classes').then((r) => r.json()).then((d) => d.success && setClasses(d.data));
    fetch('/api/subjects').then((r) => r.json()).then((d) => d.success && setSubjects(d.data));
    fetch('/api/staff?limit=200&status=active').then((r) => r.json()).then((d) => d.success && setStaffList(d.data));
    fetchPeriods();
  }, [fetchPeriods]);

  useEffect(() => {
    if (classId) {
      fetch(`/api/sections?class_id=${classId}`)
        .then((r) => r.json())
        .then((d) => d.success && setSections(d.data));
      fetchEntries();
    } else {
      setSections([]);
      setEntries([]);
      setClassSubjectIds([]);
    }
  }, [classId, sectionId, fetchEntries]);

  const saveCell = async (day: number, periodId: number) => {
    const res = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: parseInt(classId, 10),
        section_id: sectionId ? parseInt(sectionId, 10) : null,
        day_of_week: day,
        period_id: periodId,
        subject_id: editSubject ? parseInt(editSubject, 10) : null,
        staff_id: editStaff ? parseInt(editStaff, 10) : null,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      await alert(data.error || 'Failed to save', { title: 'Error', type: 'error' });
      return;
    }
    setEditCell(null);
    fetchEntries();
  };

  const clearSectionOverride = async (day: number, periodId: number) => {
    const entry = getEntry(day, periodId);
    if (!entry || entry.is_inherited || !sectionId) return;
    const ok = await confirm('Remove this section override and use the class template?', {
      title: 'Use template',
      type: 'info',
    });
    if (!ok) return;
    const res = await fetch(
      `/api/timetable?id=${entry.id}`,
      { method: 'DELETE' }
    );
    const data = await res.json();
    if (data.success) {
      setEditCell(null);
      fetchEntries();
    } else {
      await alert(data.error || 'Failed to reset', { title: 'Error', type: 'error' });
    }
  };

  const applyTemplateToSections = async () => {
    if (!classId || sections.length === 0) {
      await alert('Add sections to this class first.', { title: 'No sections', type: 'warning' });
      return;
    }
    if (filledTemplateSlots === 0) {
      await alert('Fill the class template under "All sections" before applying.', {
        title: 'Empty template',
        type: 'warning',
      });
      return;
    }
    const ok = await confirm(
      `Apply the class template to all ${sections.length} section(s)? Subjects not assigned to this class will be left free in each section.`,
      { title: 'Apply to all sections', type: 'warning' }
    );
    if (!ok) return;

    setApplyingTemplate(true);
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_to_sections', class_id: parseInt(classId, 10) }),
      });
      const data = await res.json();
      if (data.success) {
        const skipped = data.data?.subjects_left_free ?? 0;
        await alert(
          `${data.message}.${skipped > 0 ? ` ${skipped} slot(s) left free where subject is not assigned to the class.` : ''}`,
          { title: 'Success', type: 'success' }
        );
        if (sectionId) fetchEntries();
      } else {
        await alert(data.error || 'Failed to apply template', { title: 'Error', type: 'error' });
      }
    } finally {
      setApplyingTemplate(false);
    }
  };

  const closePeriodForm = () => {
    setShowPeriodForm(false);
    setEditingPeriodId(null);
    setPeriodForm({ name: '', start_time: '', end_time: '' });
  };

  const openAddPeriodForm = () => {
    const suggestedTimes = getSuggestedNewPeriodTimes(periods);
    setEditingPeriodId(null);
    setPeriodForm({
      name: `Period ${periods.length + 1}`,
      start_time: suggestedTimes.start_time,
      end_time: suggestedTimes.end_time,
    });
    setShowPeriodForm(true);
  };

  const openEditPeriodForm = (period: Period) => {
    setEditingPeriodId(period.id);
    setPeriodForm({
      name: period.name,
      start_time: formatTime(period.start_time),
      end_time: formatTime(period.end_time),
    });
    setShowPeriodForm(true);
  };

  const savePeriod = async () => {
    if (!periodForm.name.trim()) {
      await alert('Enter a period name', { title: 'Required', type: 'warning' });
      return;
    }
    setSavingPeriod(true);
    try {
      const isEdit = editingPeriodId != null;
      const res = await fetch(
        isEdit ? `/api/timetable/periods/${editingPeriodId}` : '/api/timetable/periods',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: periodForm.name.trim(),
            start_time: periodForm.start_time || null,
            end_time: periodForm.end_time || null,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        closePeriodForm();
        await fetchPeriods();
        if (classId) await fetchEntries();
        await alert(
          isEdit ? 'Period updated successfully' : 'Period added successfully',
          { title: 'Success', type: 'success' }
        );
      } else {
        await alert(data.error || 'Failed to save period', { title: 'Error', type: 'error' });
      }
    } finally {
      setSavingPeriod(false);
    }
  };

  const removePeriod = async (period: Period) => {
    const ok = await confirm(`Remove period "${period.name}"?`, { title: 'Remove Period', type: 'warning' });
    if (!ok) return;
    const res = await fetch(`/api/timetable/periods/${period.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      if (editingPeriodId === period.id) closePeriodForm();
      await fetchPeriods();
      if (classId) await fetchEntries();
      await alert(data.message || 'Period removed', { title: 'Done', type: 'success' });
    } else {
      await alert(data.error || 'Failed to remove period', { title: 'Error', type: 'error' });
    }
  };

  const togglePeriodActive = async (period: Period) => {
    const nextActive = period.is_active === false;
    const res = await fetch(`/api/timetable/periods/${period.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: period.name,
        start_time: formatTime(period.start_time) || null,
        end_time: formatTime(period.end_time) || null,
        sort_order: period.sort_order,
        is_active: nextActive,
      }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchPeriods();
      if (classId) await fetchEntries();
      await alert(
        nextActive ? 'Period activated' : 'Period deactivated',
        { title: 'Success', type: 'success' },
      );
    } else {
      await alert(data.error || 'Failed to update period status', { title: 'Error', type: 'error' });
    }
  };

  const getEntry = (day: number, periodId: number) =>
    entries.find((e) => e.day_of_week === day && e.period_id === periodId);

  const selectedSectionName = sections.find((s) => s.id.toString() === sectionId)?.name;

  return (
    <DashboardLayout>
      <div className="space-y-6 min-w-0 max-w-full">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-xl flex items-center gap-2 text-gray-900">
              <FiCalendar className="text-primary-600" /> Timetable
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Build a class template, then apply it to all sections in one click
            </p>
          </div>
          <Link
            href="/academics/subjects"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <FiBook className="w-4 h-4" />
            Manage Subjects
          </Link>
        </div>

        {/* Periods */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FiClock className="text-primary-600" /> School Periods
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                9 default periods are created automatically. Activate, edit, or remove periods as needed.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddPeriodForm}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              <FiPlus className="w-4 h-4" />
              Add Period
            </button>
          </div>

          {showPeriodForm && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
              <p className="text-sm font-medium text-gray-700">
                {editingPeriodId ? 'Edit period' : 'New period'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Period name"
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="time"
                  value={periodForm.start_time}
                  onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="time"
                  value={periodForm.end_time}
                  onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={savePeriod}
                    disabled={savingPeriod}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingPeriod ? 'Saving...' : editingPeriodId ? 'Update Period' : 'Save Period'}
                  </button>
                  <button type="button" onClick={closePeriodForm} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {loadingPeriods ? (
            <PeriodsSkeleton />
          ) : periods.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No periods found.</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      S.N.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {periods.map((period, index) => {
                    const isActive = period.is_active !== false;
                    return (
                      <tr
                        key={period.id}
                        className={isActive ? 'bg-white' : 'bg-gray-50 text-gray-500'}
                      >
                        <td className="px-4 py-3 tabular-nums">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{period.name}</td>
                        <td className="px-4 py-3">
                          {formatTime(period.start_time) || '—'}
                          {period.end_time ? ` – ${formatTime(period.end_time)}` : ''}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditPeriodForm(period)}
                              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded"
                              title="Edit period"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => togglePeriodActive(period)}
                              className="px-2 py-1 text-xs font-medium border border-gray-200 rounded hover:bg-gray-100"
                            >
                              {isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removePeriod(period)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete period"
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
          )}
        </div>

        {/* Class / section */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"
            >
              <option value="">Select class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={!classId}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px] disabled:bg-gray-50"
            >
              <option value="">All sections (class template)</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {isTemplateView && sections.length > 0 && (
            <button
              type="button"
              onClick={applyTemplateToSections}
              disabled={applyingTemplate || filledTemplateSlots === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <FiCopy className="w-4 h-4" />
              {applyingTemplate ? 'Applying...' : `Apply template to ${sections.length} section(s)`}
            </button>
          )}
        </div>

        {classId && isTemplateView && (
          <div className="flex items-start gap-2 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <FiInfo className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Class template mode</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Fill this grid once for the whole class. Then click &quot;Apply template to all sections&quot; to copy it to every section.
                Subjects not assigned to this class will be left as <strong>Free</strong> per section.
              </p>
            </div>
          </div>
        )}

        {classId && sectionId && (
          <div className="flex items-start gap-2 text-sm text-purple-800 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
            <FiInfo className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Section: {selectedSectionName}</p>
              <p className="text-xs text-purple-700 mt-0.5">
                Italic cells inherit from the class template. Click to override for this section only.
                {templateEntryCount === 0 && ' No class template yet — switch to "All sections" to create one.'}
              </p>
            </div>
          </div>
        )}

        {!classId && (
          <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">
            Select a class to view and edit its weekly timetable.
          </div>
        )}

        {classId && !loadingPeriods && activePeriods.length === 0 && (
          <div className="text-center py-12 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            Activate at least one period above before assigning subjects to the timetable.
          </div>
        )}

        {classId && (loadingPeriods || activePeriods.length > 0) && loadingTimetable && (
          <TimetableGridSkeleton periodCount={activePeriods.length} />
        )}

        {classId && activePeriods.length > 0 && !loadingTimetable && (
          <div className="overflow-x-auto max-w-full space-y-3">
            {availableSubjects.length === 0 && subjects.length > 0 && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                <span>No subjects assigned to this class yet. Assign subjects before filling the timetable.</span>
                <Link href="/academics/subjects" className="text-primary-600 font-medium hover:underline">
                  Go to Subject Management →
                </Link>
              </div>
            )}
            {subjects.length === 0 && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                <span>No subjects found.</span>
                <Link href="/academics/subjects" className="text-primary-600 font-medium hover:underline">
                  Go to Subject Management →
                </Link>
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-white border rounded" /> Custom / template</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-purple-50 border border-purple-200 rounded italic text-[10px] px-0.5">T</span> Inherited from class template</span>
            </div>

            <table className="w-full text-sm border min-w-[700px] bg-white rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border">Day / Period</th>
                  {activePeriods.map((p) => (
                    <th key={p.id} className="p-2 border text-xs">
                      {p.name}
                      <br />
                      <span className="text-gray-400 font-normal">
                        {formatTime(p.start_time)}
                        {p.end_time ? ` – ${formatTime(p.end_time)}` : ''}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEEKDAYS.map((day) => (
                  <tr key={day}>
                    <td className="p-2 border font-medium">{DAYS[day]}</td>
                    {activePeriods.map((p) => {
                      const entry = getEntry(day, p.id);
                      const isEditing = editCell?.day === day && editCell?.periodId === p.id;
                      const inherited = !!entry?.is_inherited;
                      const label = entry?.subject_name || '—';

                      return (
                        <td
                          key={p.id}
                          className={`p-1 border text-center min-w-[100px] ${inherited ? 'bg-purple-50/50' : ''}`}
                        >
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <select
                                value={editSubject}
                                onChange={(e) => setEditSubject(e.target.value)}
                                className="text-xs border rounded px-1"
                              >
                                <option value="">Free</option>
                                {availableSubjects.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              <select
                                value={editStaff}
                                onChange={(e) => setEditStaff(e.target.value)}
                                className="text-xs border rounded px-1"
                              >
                                <option value="">No teacher</option>
                                {staffList.map((s) => (
                                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => saveCell(day, p.id)}
                                className="text-xs bg-primary-600 text-white rounded px-1 py-0.5"
                              >
                                Save
                              </button>
                              {sectionId && entry && !entry.is_inherited && (
                                <button
                                  type="button"
                                  onClick={() => clearSectionOverride(day, p.id)}
                                  className="text-xs text-purple-700 hover:underline"
                                >
                                  Use template
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditCell({ day, periodId: p.id });
                                setEditSubject(entry?.subject_id?.toString() || '');
                                setEditStaff(entry?.staff_id?.toString() || '');
                              }}
                              className={`w-full p-1 hover:bg-gray-50 rounded text-xs ${inherited ? 'italic text-purple-800' : ''}`}
                              title={inherited ? 'Inherited from class template — click to override' : undefined}
                            >
                              <div>{label}</div>
                              {entry?.teacher_name && (
                                <div className="text-[10px] text-gray-500 font-normal">{entry.teacher_name}</div>
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
