'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StaffOption, TimetablePeriod, WorkingDay } from '@/features/timetable/types';
import { getWorkingDays, isPeriodAllowedOnDay, selectClass } from '@/features/timetable/utils';
import { printTeacherAvailability } from '@/features/timetable/utils/print-timetable';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPrinter, FiSave } from 'react-icons/fi';

type AvailabilityMap = Record<string, boolean>;

function slotKey(day: number, periodId: number) {
  return `${day}-${periodId}`;
}

export default function TimetableAvailabilityTab() {
  const { alert } = useDialog();
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [staffId, setStaffId] = useState('');
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const schedulablePeriods = useMemo(
    () =>
      periods.filter(
        (p) => p.is_schedulable !== false && (p.slot_type === 'period' || !p.slot_type),
      ),
    [periods],
  );

  const activeWorkingDays = useMemo(() => getWorkingDays(workingDays), [workingDays]);

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

  const loadAvailability = useCallback(async (sid: string) => {
    if (!sid) {
      setAvailability({});
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable/availability?staff_id=${sid}`);
      const data = await res.json();
      if (data.success) {
        const map: AvailabilityMap = {};
        for (const slot of data.data.availability as {
          day_of_week: number;
          period_id: number;
          is_available: boolean;
        }[]) {
          map[slotKey(slot.day_of_week, slot.period_id)] = slot.is_available;
        }
        setAvailability(map);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvailability(staffId);
  }, [staffId, loadAvailability]);

  const isAvailable = (day: number, periodId: number) => {
    const key = slotKey(day, periodId);
    return availability[key] !== false;
  };

  const toggleSlot = (day: number, periodId: number) => {
    const key = slotKey(day, periodId);
    setAvailability((prev) => ({
      ...prev,
      [key]: prev[key] === false,
    }));
  };

  const saveAvailability = async () => {
    if (!staffId) return;
    setSaving(true);
    try {
      const slots: { day_of_week: number; period_id: number; is_available: boolean }[] = [];
      for (const day of activeWorkingDays) {
        for (const period of schedulablePeriods) {
          slots.push({
            day_of_week: day.day_of_week,
            period_id: period.id,
            is_available: isAvailable(day.day_of_week, period.id),
          });
        }
      }
      const res = await fetch('/api/timetable/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: parseInt(staffId, 10), slots }),
      });
      const data = await res.json();
      if (data.success) {
        await alert('Teacher availability saved', { title: 'Success', type: 'success' });
      } else {
        await alert(data.error || 'Failed to save', { title: 'Error', type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedTeacher = staffList.find((s) => s.id.toString() === staffId);

  const handlePrint = async () => {
    if (!staffId || !selectedTeacher) {
      await alert('Select a teacher first', { title: 'Print', type: 'warning' });
      return;
    }
    const teacherName = `${selectedTeacher.first_name} ${selectedTeacher.last_name}`;
    const success = printTeacherAvailability({
      teacherName,
      periods,
      workingDays,
      isAvailable,
    });
    if (!success) {
      await alert('Please allow popups to print', { title: 'Print blocked', type: 'warning' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <p className="font-medium">Step 5 — Teacher Availability</p>
        <p className="text-xs mt-0.5 text-blue-700">
          Mark periods when a teacher is busy. The builder blocks scheduling during unavailable slots.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[220px]">
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
          <>
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <FiPrinter className="w-4 h-4" />
              Print availability
            </button>
            <button
              type="button"
              onClick={saveAvailability}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save availability'}
            </button>
          </>
        )}
      </div>

      {!staffId && (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">
          Select a teacher to edit their weekly availability grid.
        </div>
      )}

      {staffId && loading && (
        <div className="text-sm text-gray-500 py-8 text-center">Loading availability...</div>
      )}

      {staffId && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <p className="text-sm font-medium text-gray-900">
              {selectedTeacher?.first_name} {selectedTeacher?.last_name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Click a cell to toggle between Available and Busy
            </p>
          </div>
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
                    <td className="p-2 border font-medium text-xs whitespace-nowrap">{period.name}</td>
                    {activeWorkingDays.map((day) => {
                      const allowed = isPeriodAllowedOnDay(
                        period.id,
                        day.day_of_week,
                        periods,
                        workingDays,
                      );
                      const available = isAvailable(day.day_of_week, period.id);
                      return (
                        <td key={day.day_of_week} className="p-1 border text-center">
                          {!allowed ? (
                            <span className="text-gray-300 text-xs">—</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleSlot(day.day_of_week, period.id)}
                              className={`w-full py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                                available
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                            >
                              {available ? 'Available' : 'Busy'}
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
          <div className="px-4 pb-4 flex gap-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-green-100 border border-green-200 rounded" /> Available
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-red-100 border border-red-200 rounded" /> Busy
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
