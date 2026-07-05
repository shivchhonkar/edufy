'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ClassOption,
  CurriculumSubject,
  SectionOption,
  TimetableConflict,
  TimetableEntry,
  TimetablePeriod,
  WorkingDay,
} from '@/features/timetable/types';
import {
  formatTime,
  getWorkingDays,
  isPeriodAllowedOnDay,
  selectClass,
  subjectBadgeColor,
} from '@/features/timetable/utils';
import { sortClassesByName } from '@/lib/class-sort';
import { useDialog } from '@/shared/context/DialogContext';
import { FiAlertCircle, FiCopy, FiInfo, FiPrinter, FiTrash2 } from 'react-icons/fi';
import {
  printClassTimetable,
} from '@/features/timetable/utils/print-timetable';

interface DragSubject {
  subjectId: number;
  subjectName: string;
}

export default function TimetableBuilderTab() {
  const { alert, confirm } = useDialog();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumSubject[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [dragSubject, setDragSubject] = useState<DragSubject | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [conflict, setConflict] = useState<TimetableConflict | null>(null);
  const [templateEntryCount, setTemplateEntryCount] = useState(0);

  const isTemplateView = !!classId && !sectionId;
  const activeWorkingDays = useMemo(() => getWorkingDays(workingDays), [workingDays]);
  const sortedPeriods = useMemo(
    () => [...periods].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [periods],
  );

  const builderSubjects = useMemo(
    () => [...curriculum].sort((a, b) => a.subject_name.localeCompare(b.subject_name)),
    [curriculum],
  );

  const hasClassSubjects = curriculum.length > 0;

  const scheduledMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const subject of builderSubjects) {
      if (isTemplateView) {
        map[subject.subject_id] = entries.filter(
          (entry) => entry.subject_id === subject.subject_id,
        ).length;
      } else {
        map[subject.subject_id] = subject.scheduled_periods ?? 0;
      }
    }
    return map;
  }, [builderSubjects, entries, isTemplateView]);

  useEffect(() => {
    Promise.all([
      fetch('/api/classes?active_only=true').then((r) => r.json()),
      fetch('/api/timetable/setup').then((r) => r.json()),
    ]).then(([classRes, setupRes]) => {
      if (classRes.success) setClasses(sortClassesByName(classRes.data));
      if (setupRes.success) {
        setPeriods(setupRes.data.periods.filter((p: TimetablePeriod) => p.is_active !== false));
        setWorkingDays(setupRes.data.working_days);
      }
    });
  }, []);

  const loadCurriculum = useCallback(async (cid: string, signal?: AbortSignal) => {
    if (!cid) {
      setCurriculum([]);
      return;
    }
    const res = await fetch(`/api/timetable/curriculum?class_id=${cid}`, { signal });
    const data = await res.json();
    if (signal?.aborted) return;
    if (data.success) setCurriculum(data.data.subjects);
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!classId) {
      setEntries([]);
      setTemplateEntryCount(0);
      return;
    }
    setLoading(true);
    try {
      let url = `/api/timetable?class_id=${classId}`;
      if (sectionId) url += `&section_id=${sectionId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data.entries);
        if (data.data.sections?.length) setSections(data.data.sections);
        setTemplateEntryCount(data.data.meta?.template_entry_count ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [classId, sectionId]);

  useEffect(() => {
    if (!classId) {
      setSections([]);
      setEntries([]);
      setCurriculum([]);
      return;
    }

    const controller = new AbortController();
    setCurriculum([]);

    fetch(`/api/sections?class_id=${classId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => d.success && setSections(d.data))
      .catch(() => {});

    loadCurriculum(classId, controller.signal).catch(() => {});
    fetchEntries();

    return () => controller.abort();
  }, [classId, sectionId, fetchEntries, loadCurriculum]);

  const getEntry = (day: number, periodId: number) =>
    entries.find((e) => e.day_of_week === day && e.period_id === periodId);

  const placeSubject = async (day: number, periodId: number, subjectId: number | null) => {
    const res = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: parseInt(classId, 10),
        section_id: sectionId ? parseInt(sectionId, 10) : null,
        day_of_week: day,
        period_id: periodId,
        subject_id: subjectId,
        auto_assign: true,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      if (data.conflicts?.length) {
        setConflict(data.conflicts[0]);
      } else {
        await alert(data.error || 'Failed to schedule', { title: 'Error', type: 'error' });
      }
      return;
    }
    setConflict(null);
    await fetchEntries();
    await loadCurriculum(classId);
  };

  const clearCell = async (day: number, periodId: number) => {
    const entry = getEntry(day, periodId);
    if (!entry?.subject_id || entry.is_inherited) return;
    const ok = await confirm('Clear this period?', { title: 'Clear slot', type: 'warning' });
    if (!ok) return;
    await placeSubject(day, periodId, null);
  };

  const handleDrop = async (day: number, periodId: number) => {
    if (!dragSubject || !classId) return;
    const schedulable =
      periods.find((p) => p.id === periodId)?.is_schedulable !== false &&
      periods.find((p) => p.id === periodId)?.slot_type !== 'break' &&
      periods.find((p) => p.id === periodId)?.slot_type !== 'lunch';
    if (!schedulable) return;
    if (!isPeriodAllowedOnDay(periodId, day, periods, workingDays)) return;
    await placeSubject(day, periodId, dragSubject.subjectId);
    setDragSubject(null);
    setDropTarget(null);
  };

  const applyTemplateToSections = async () => {
    if (!classId || sections.length === 0) {
      await alert('Add sections to this class first.', { title: 'No sections', type: 'warning' });
      return;
    }
    const filled = entries.filter((e) => e.subject_id != null).length;
    if (filled === 0) {
      await alert('Fill the class template before applying.', { title: 'Empty template', type: 'warning' });
      return;
    }
    const ok = await confirm(
      `Apply the class template to all ${sections.length} section(s)?`,
      { title: 'Apply to all sections', type: 'warning' },
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
        await alert(data.message || 'Template applied', { title: 'Success', type: 'success' });
      } else {
        await alert(data.error || 'Failed to apply', { title: 'Error', type: 'error' });
      }
    } finally {
      setApplyingTemplate(false);
    }
  };

  const selectedClassName = classes.find((c) => c.id.toString() === classId)?.name;
  const selectedSectionName = sections.find((s) => s.id.toString() === sectionId)?.name;

  const handlePrintTimetable = async () => {
    if (!classId) {
      await alert('Select a class first', { title: 'Print', type: 'warning' });
      return;
    }
    const title = `${selectedClassName ?? 'Class'}${
      selectedSectionName ? ` — ${selectedSectionName}` : ' — Class Template'
    }`;
    const success = printClassTimetable({
      title,
      subtitle: selectedSectionName ? 'Section timetable' : 'Class template timetable',
      periods,
      workingDays,
      entries,
    });
    if (!success) {
      await alert('Please allow popups to print', { title: 'Print blocked', type: 'warning' });
    }
  };

  const handlePrintClassTemplate = async () => {
    if (!classId) {
      await alert('Select a class first', { title: 'Print', type: 'warning' });
      return;
    }
    let templateEntries = entries;
    if (sectionId) {
      const res = await fetch(`/api/timetable?class_id=${classId}`);
      const data = await res.json();
      if (!data.success) {
        await alert(data.error || 'Failed to load class template', { title: 'Error', type: 'error' });
        return;
      }
      templateEntries = data.data.entries;
    }
    const success = printClassTimetable({
      title: `${selectedClassName ?? 'Class'} — Class Template`,
      subtitle: 'Shared template for all sections',
      periods,
      workingDays,
      entries: templateEntries,
    });
    if (!success) {
      await alert('Please allow popups to print', { title: 'Print blocked', type: 'warning' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <p className="font-medium">Step 7 — Timetable Builder</p>
        <p className="text-xs mt-0.5 text-blue-700">
          Drag subjects onto the grid. Teacher and room are filled automatically. Weekly periods are a
          target — you can schedule more when needed.
        </p>
      </div>

      {conflict && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
          <FiAlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Conflict</p>
            <p className="text-xs mt-0.5">{conflict.message}</p>
            <button
              type="button"
              onClick={() => setConflict(null)}
              className="text-xs underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId('');
            }}
            className={`min-w-[160px] ${selectClass}`}
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={!classId}
            className={`min-w-[160px] ${selectClass} disabled:bg-gray-50`}
          >
            <option value="">All sections (class template)</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {isTemplateView && sections.length > 0 && (
          <button
            type="button"
            onClick={applyTemplateToSections}
            disabled={applyingTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <FiCopy className="w-4 h-4" />
            {applyingTemplate ? 'Applying...' : `Apply to ${sections.length} section(s)`}
          </button>
        )}
        {classId && (
          <>
            <button
              type="button"
              onClick={handlePrintTimetable}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <FiPrinter className="w-4 h-4" />
              Print timetable
            </button>
            {sectionId && (
              <button
                type="button"
                onClick={handlePrintClassTemplate}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <FiPrinter className="w-4 h-4" />
                Print class template
              </button>
            )}
          </>
        )}
      </div>

      {classId && isTemplateView && (
        <div className="flex items-start gap-2 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <FiInfo className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs">
            Build the class template once, then apply it to all sections. Override individual sections as needed.
          </p>
        </div>
      )}

      {classId && sectionId && (
        <div className="flex items-start gap-2 text-sm text-purple-800 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
          <FiInfo className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs">
            Section {selectedSectionName}: italic cells inherit from the class template.
            {templateEntryCount === 0 && ' No class template yet.'}
          </p>
        </div>
      )}

      {!classId && (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">
          Select a class to open the drag-and-drop builder.
        </div>
      )}

      {classId && (
        <div className="flex flex-col lg:flex-row gap-4 min-h-0">
          <aside className="lg:w-56 shrink-0 bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subjects</p>
              {selectedClassName && (
                <p className="text-[11px] text-gray-500 mt-0.5 truncate" title={selectedClassName}>
                  {selectedClassName} subjects
                </p>
              )}
            </div>
            {!hasClassSubjects ? (
              <p className="text-xs text-gray-500">
                No subjects assigned to this class.{' '}
                <Link href="/academics/subjects" className="text-primary-600 hover:underline">
                  Assign subjects
                </Link>
              </p>
            ) : (
              <ul className="space-y-2 max-h-[min(60vh,520px)] overflow-y-auto">
                {builderSubjects.map((subject) => {
                  const scheduled = scheduledMap[subject.subject_id] ?? 0;
                  const target = subject.weekly_periods;
                  const hasTarget = target > 0;
                  const overTarget = hasTarget && scheduled > target;
                  return (
                    <li key={subject.subject_id}>
                      <div
                        draggable
                        onDragStart={() =>
                          setDragSubject({
                            subjectId: subject.subject_id,
                            subjectName: subject.subject_name,
                          })
                        }
                        onDragEnd={() => setDragSubject(null)}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm cursor-grab active:cursor-grabbing ${
                          overTarget
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : subjectBadgeColor(subject.subject_name)
                        }`}
                      >
                        <span className="font-medium truncate">{subject.subject_name}</span>
                        <span
                          className={`text-xs tabular-nums shrink-0 ${
                            overTarget ? 'font-semibold text-amber-800' : ''
                          }`}
                          title={
                            hasTarget
                              ? `${scheduled} scheduled · ${target} target`
                              : `${scheduled} scheduled · no weekly target set`
                          }
                        >
                          {hasTarget ? `(${scheduled}/${target})` : `(${scheduled})`}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-[10px] text-gray-400 pt-2 border-t">
              {hasClassSubjects
                ? 'Count shows scheduled / target from Curriculum. No target → scheduled count only.'
                : 'Drag subjects onto the class template grid.'}
            </p>
            <p className="text-[10px] text-gray-400">
              Drag onto a cell. Drop on an occupied cell to replace (if valid).
            </p>
          </aside>

          <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <p className="text-sm font-medium text-gray-900">
                {selectedClassName}
                {selectedSectionName ? ` — ${selectedSectionName}` : ' — Class template'}
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading timetable...</div>
            ) : (
              <div className="overflow-x-auto p-4">
                <table className="min-w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border text-xs font-semibold text-gray-500 w-24">Period</th>
                      {activeWorkingDays.map((day) => (
                        <th key={day.day_of_week} className="p-2 border text-xs font-semibold text-gray-500 min-w-[100px]">
                          {day.day_name.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPeriods.map((period) => {
                      const isBreak =
                        period.is_schedulable === false ||
                        period.slot_type === 'break' ||
                        period.slot_type === 'lunch';

                      if (isBreak) {
                        return (
                          <tr key={period.id} className="bg-amber-50">
                            <td className="p-2 border font-medium text-xs text-amber-800">{period.name}</td>
                            <td
                              colSpan={activeWorkingDays.length}
                              className="p-2 border text-center text-xs text-amber-700"
                            >
                              {formatTime(period.start_time)}
                              {period.end_time ? ` – ${formatTime(period.end_time)}` : ''} · Not schedulable
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={period.id}>
                          <td className="p-2 border font-medium text-xs whitespace-nowrap">
                            {period.name}
                            <div className="text-[10px] text-gray-400 font-normal">
                              {formatTime(period.start_time)}
                            </div>
                          </td>
                          {activeWorkingDays.map((day) => {
                            const allowed = isPeriodAllowedOnDay(
                              period.id,
                              day.day_of_week,
                              periods,
                              workingDays,
                            );
                            const entry = getEntry(day.day_of_week, period.id);
                            const inherited = !!entry?.is_inherited;
                            const cellKey = `${day.day_of_week}-${period.id}`;
                            const isOver = dropTarget === cellKey;

                            return (
                              <td
                                key={day.day_of_week}
                                className={`p-1 border align-top ${inherited ? 'bg-purple-50/40' : ''} ${
                                  !allowed ? 'bg-gray-50' : ''
                                }`}
                                onDragOver={(e) => {
                                  if (!allowed || !dragSubject) return;
                                  e.preventDefault();
                                  setDropTarget(cellKey);
                                }}
                                onDragLeave={() => setDropTarget(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  handleDrop(day.day_of_week, period.id);
                                }}
                              >
                                {!allowed ? (
                                  <span className="block text-center text-gray-300 text-xs py-4">—</span>
                                ) : (
                                  <div
                                    className={`relative min-h-[56px] rounded-md border transition-colors ${
                                      isOver
                                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                                        : 'border-transparent hover:border-gray-200'
                                    } ${inherited ? 'italic' : ''}`}
                                  >
                                    {entry?.subject_name ? (
                                      <>
                                        <div className="p-1.5 text-xs font-medium text-gray-900">
                                          {entry.subject_name}
                                        </div>
                                        {entry.teacher_name && (
                                          <div className="px-1.5 text-[10px] text-gray-500">
                                            {entry.teacher_name}
                                          </div>
                                        )}
                                        {entry.room && (
                                          <div className="px-1.5 text-[10px] text-gray-400">{entry.room}</div>
                                        )}
                                        {!inherited && (
                                          <button
                                            type="button"
                                            onClick={() => clearCell(day.day_of_week, period.id)}
                                            className="absolute top-0.5 right-0.5 p-0.5 text-gray-400 hover:text-red-600 rounded"
                                            title="Clear"
                                          >
                                            <FiTrash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <div className="flex items-center justify-center h-full min-h-[56px] text-[10px] text-gray-300">
                                        Drop here
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
