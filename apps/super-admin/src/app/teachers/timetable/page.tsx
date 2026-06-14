'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TeacherNav from '@/features/teachers/components/TeacherNav';
import { FiCalendar } from 'react-icons/fi';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS = [1, 2, 3, 4, 5, 6];

interface Staff { id: number; first_name: string; last_name: string; }
interface Period { id: number; name: string; start_time: string; end_time: string; sort_order: number; }
interface Entry {
  id: number;
  day_of_week: number;
  period_id: number;
  subject_name: string;
  class_name: string;
  section_name: string;
  period_name: string;
  start_time: string;
  end_time: string;
}

function formatTime(t: string) {
  return String(t || '').slice(0, 5);
}

export default function TeacherTimetablePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffId, setStaffId] = useState('');
  const [periods, setPeriods] = useState<Period[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/staff?limit=200&status=active')
      .then((r) => r.json())
      .then((d) => d.success && setStaff(d.data));
  }, []);

  const fetchTimetable = useCallback(async () => {
    if (!staffId) {
      setEntries([]);
      setPeriods([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?staff_id=${staffId}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data.entries);
        setPeriods(data.data.periods);
      }
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => { fetchTimetable(); }, [fetchTimetable]);

  const getEntry = (day: number, periodId: number) =>
    entries.find((e) => e.day_of_week === day && e.period_id === periodId);

  const selectedTeacher = staff.find((s) => String(s.id) === staffId);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <TeacherNav />
        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
          <div>
            <h1 className="text-xl flex items-center gap-2"><FiCalendar className="text-primary-600" /> Teacher Timetable</h1>
            <p className="text-sm text-gray-600 mt-1">Weekly schedule for an individual teacher</p>
          </div>
          <Link href="/timetable" className="text-sm text-primary-600 hover:underline">Edit class timetable →</Link>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Teacher</label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm min-w-[240px]"
          >
            <option value="">Select teacher</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
            ))}
          </select>
        </div>

        {!staffId && (
          <div className="text-center py-12 bg-gray-50 border rounded-xl text-gray-500 text-sm">
            Select a teacher to view their weekly timetable.
          </div>
        )}

        {staffId && loading && (
          <div className="text-center py-12 text-gray-400 text-sm">Loading timetable...</div>
        )}

        {staffId && !loading && periods.length === 0 && (
          <div className="text-center py-12 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            No periods configured. <Link href="/timetable" className="text-primary-600 underline">Set up periods</Link> first.
          </div>
        )}

        {staffId && !loading && periods.length > 0 && (
          <>
            {selectedTeacher && (
              <p className="text-sm text-gray-600 mb-3">
                Showing schedule for <strong>{selectedTeacher.first_name} {selectedTeacher.last_name}</strong>
                {entries.length === 0 && ' — no slots assigned yet. Assign teachers in the class timetable.'}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border min-w-[700px] bg-white rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 border">Day / Period</th>
                    {periods.map((p) => (
                      <th key={p.id} className="p-2 border text-xs">
                        {p.name}
                        <br />
                        <span className="text-gray-400 font-normal">
                          {formatTime(p.start_time)}{p.end_time ? ` – ${formatTime(p.end_time)}` : ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WEEKDAYS.map((day) => (
                    <tr key={day}>
                      <td className="p-2 border font-medium">{DAYS[day]}</td>
                      {periods.map((p) => {
                        const entry = getEntry(day, p.id);
                        return (
                          <td key={p.id} className="p-2 border text-center min-w-[100px]">
                            {entry ? (
                              <div className="text-xs">
                                <div className="font-medium text-gray-900">{entry.subject_name || '—'}</div>
                                <div className="text-gray-500">{entry.class_name}{entry.section_name ? ` · ${entry.section_name}` : ''}</div>
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
