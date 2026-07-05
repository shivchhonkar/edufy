'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StaffOption, TimetableEntry, TimetablePeriod, WorkingDay } from '@/features/timetable/types';
import {
  formatTime,
  getWorkingDays,
  isPeriodAllowedOnDay,
  selectClass,
} from '@/features/timetable/utils';
import { printTeacherTimetable } from '@/features/timetable/utils/print-timetable';
import { useDialog } from '@/shared/context/DialogContext';
import { FiInfo, FiPrinter } from 'react-icons/fi';

export default function TimetableTeacherViewTab() {
  const { alert } = useDialog();
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [staffId, setStaffId] = useState('');
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const activeWorkingDays = useMemo(() => getWorkingDays(workingDays), [workingDays]);
  const sortedPeriods = useMemo(
    () => [...periods].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [periods],
  );
  const schedulablePeriods = useMemo(
    () =>
      sortedPeriods.filter(
        (p) => p.is_schedulable !== false && p.slot_type !== 'break' && p.slot_type !== 'lunch',
      ),
    [sortedPeriods],
  );

  useEffect(() => {
    Promise.all([
      fetch('/api/staff?limit=300&status=active').then((r) => r.json()),
      fetch('/api/timetable/setup').then((r) => r.json()),
    ]).then(([staffRes, setupRes]) => {
      if (staffRes.success) setStaffList(staffRes.data);
      if (setupRes.success) {
        setPeriods(setupRes.data.periods.filter((p: TimetablePeriod) => p.is_active !== false));
        setWorkingDays(setupRes.data.working_days);
      }
    });
  }, []);

  const loadTeacherTimetable = useCallback(async (sid: string) => {
    if (!sid) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?staff_id=${sid}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data.entries);
        if (data.data.periods?.length) setPeriods(data.data.periods);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeacherTimetable(staffId);
  }, [staffId, loadTeacherTimetable]);

  const getEntry = (day: number, periodId: number) =>
    entries.find((e) => e.day_of_week === day && e.period_id === periodId);

  const selectedTeacher = staffList.find((s) => s.id.toString() === staffId);

  const formatAssignment = (entry: TimetableEntry | undefined) => {
    if (!entry?.class_name) return 'Free';
    const section = entry.section_name ? ` ${entry.section_name}` : '';
    return `${entry.class_name}${section}`;
  };

  const handlePrint = async () => {
    if (!staffId || !selectedTeacher) {
      await alert('Select a teacher first', { title: 'Print', type: 'warning' });
      return;
    }
    const teacherName = `${selectedTeacher.first_name} ${selectedTeacher.last_name}`;
    const success = printTeacherTimetable({
      teacherName,
      periods,
      workingDays,
      entries,
    });
    if (!success) {
      await alert('Please allow popups to print', { title: 'Print blocked', type: 'warning' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <p className="font-medium">Teacher Timetable</p>
        <p className="text-xs mt-0.5 text-blue-700">
          Auto-generated from class timetables. No manual entry — update assignments in the Builder tab.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[220px] max-w-xs">
          <label className="block text-xs font-medium text-gray-600 mb-1">Teacher</label>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={selectClass}>
            <option value="">Select teacher</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>
        {staffId && (
          <button
            type="button"
            onClick={handlePrint}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <FiPrinter className="w-4 h-4" />
            Print timetable
          </button>
        )}
      </div>

      {!staffId && (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">
          Select a teacher to view their weekly schedule.
        </div>
      )}

      {staffId && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-start gap-2">
            <FiInfo className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectedTeacher?.first_name} {selectedTeacher?.last_name}
              </p>
              <p className="text-xs text-gray-500">Shows class/section per period from saved timetables</p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto p-4">
              <table className="min-w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 border text-xs font-semibold text-gray-500">Period</th>
                    {activeWorkingDays.map((day) => (
                      <th key={day.day_of_week} className="p-2 border text-xs font-semibold text-gray-500">
                        {day.day_name.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedulablePeriods.map((period) => (
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
                        const label = formatAssignment(entry);
                        const isFree = label === 'Free';

                        return (
                          <td
                            key={day.day_of_week}
                            className={`p-2 border text-center text-xs ${
                              !allowed ? 'bg-gray-50 text-gray-300' : isFree ? 'text-gray-400' : 'font-medium text-gray-900'
                            }`}
                          >
                            {!allowed ? '—' : label}
                            {entry?.subject_name && !isFree && (
                              <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                                {entry.subject_name}
                              </div>
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
      )}
    </div>
  );
}
