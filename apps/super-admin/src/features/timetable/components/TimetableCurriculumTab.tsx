'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClassOption, CurriculumSubject } from '@/features/timetable/types';
import { selectClass } from '@/features/timetable/utils';
import { sortClassesByName } from '@/lib/class-sort';
import { useDialog } from '@/shared/context/DialogContext';
import { FiSave } from 'react-icons/fi';

export default function TimetableCurriculumTab() {
  const { alert } = useDialog();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState('');
  const [className, setClassName] = useState('');
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [totals, setTotals] = useState({ weekly_periods: 0, scheduled_periods: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/classes?active_only=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setClasses(sortClassesByName(d.data));
      });
  }, []);

  const loadCurriculum = useCallback(async (cid: string) => {
    if (!cid) {
      setSubjects([]);
      setClassName('');
      setTotals({ weekly_periods: 0, scheduled_periods: 0 });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable/curriculum?class_id=${cid}`);
      const data = await res.json();
      if (data.success) {
        setSubjects(data.data.subjects);
        setClassName(data.data.class_name);
        setTotals(data.data.totals);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurriculum(classId);
  }, [classId, loadCurriculum]);

  const weeklyCapacity = useMemo(() => {
    return totals.weekly_periods;
  }, [totals.weekly_periods]);

  const saveCurriculum = async () => {
    if (!classId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/timetable/curriculum', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: parseInt(classId, 10),
          subjects: subjects.map((s) => ({
            subject_id: s.subject_id,
            weekly_periods: s.weekly_periods,
            preferred_room: s.preferred_room || null,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        await alert('Curriculum allocation saved', { title: 'Success', type: 'success' });
        loadCurriculum(classId);
      } else {
        await alert(data.error || 'Failed to save', { title: 'Error', type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <p className="font-medium">Step 3 — Curriculum Period Allocation</p>
        <p className="text-xs mt-0.5 text-blue-700">
          Define how many periods each subject needs per week for each class. Scheduled counts update
          from the class template in the Builder.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[180px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className={selectClass}
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {classId && (
          <button
            type="button"
            onClick={saveCurriculum}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <FiSave className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save allocation'}
          </button>
        )}
      </div>

      {!classId && (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">
          Select a class to configure weekly subject periods.
        </div>
      )}

      {classId && loading && (
        <div className="text-sm text-gray-500 py-8 text-center">Loading curriculum...</div>
      )}

      {classId && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap justify-between gap-2">
            <p className="text-sm font-medium text-gray-900">{className} — weekly requirements</p>
            <p className="text-xs text-gray-600">
              Required: <strong>{totals.weekly_periods}</strong> · Scheduled:{' '}
              <strong>{totals.scheduled_periods}</strong>
              {totals.scheduled_periods > totals.weekly_periods && (
                <span className="text-amber-700 ml-1">(over target)</span>
              )}
            </p>
          </div>

          {subjects.length === 0 ? (
            <p className="text-sm text-amber-700 p-4">
              No subjects assigned to this class. Add subjects under Subject Management first.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                      Weekly periods
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                      Scheduled
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                      Room / Lab
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subjects.map((subject, index) => {
                    const remaining = subject.weekly_periods - subject.scheduled_periods;
                    const overTarget = subject.scheduled_periods > subject.weekly_periods;
                    return (
                      <tr key={subject.subject_id}>
                        <td className="px-4 py-3 font-medium">
                          {subject.subject_name}
                          {subject.subject_code && (
                            <span className="text-gray-400 ml-1">({subject.subject_code})</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            max={40}
                            value={subject.weekly_periods}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10) || 0;
                              setSubjects((prev) =>
                                prev.map((row, i) =>
                                  i === index ? { ...row, weekly_periods: value } : row,
                                ),
                              );
                            }}
                            className={`w-20 ${selectClass}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              overTarget
                                ? 'text-amber-700 font-medium'
                                : remaining === 0 && subject.weekly_periods > 0
                                  ? 'text-green-600'
                                  : 'text-gray-600'
                            }
                          >
                            {subject.scheduled_periods}
                            {remaining > 0 && (
                              <span className="text-gray-400 text-xs ml-1">({remaining} left)</span>
                            )}
                            {overTarget && (
                              <span className="text-amber-600 text-xs ml-1">
                                (+{subject.scheduled_periods - subject.weekly_periods} over)
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            placeholder="e.g. Computer Lab"
                            value={subject.preferred_room}
                            onChange={(e) =>
                              setSubjects((prev) =>
                                prev.map((row, i) =>
                                  i === index ? { ...row, preferred_room: e.target.value } : row,
                                ),
                              )
                            }
                            className={`min-w-[160px] ${selectClass}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td className="px-4 py-3 font-semibold">Total</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{weeklyCapacity}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{totals.scheduled_periods}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
