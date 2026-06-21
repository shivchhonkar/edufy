'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiBook, FiCalendar, FiExternalLink } from 'react-icons/fi';

interface TeacherAssignment {
  id: number;
  class_name: string;
  section_name: string | null;
  subject_name: string | null;
  academic_year: string;
  is_class_teacher: boolean;
}

interface DailyActivity {
  id: number;
  activity_date: string;
  class_name: string | null;
  section_name: string | null;
  subject_name: string | null;
  topic_covered: string | null;
  periods_taught: number;
  homework_given: boolean;
  remarks: string | null;
  status: string;
}

interface StaffTeachingTabProps {
  staffId: number;
}

function formatActivityDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'partial':
      return 'bg-amber-100 text-amber-800';
    case 'missed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function StaffTeachingTab({ staffId }: StaffTeachingTabProps) {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);

  const loadTeachingData = useCallback(async () => {
    setLoading(true);
    try {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - rangeDays);
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];

      const [assignRes, activityRes] = await Promise.all([
        fetch(`/api/teacher-assignments?staff_id=${staffId}`),
        fetch(
          `/api/teacher-activities?staff_id=${staffId}&from=${fromStr}&to=${toStr}`,
        ),
      ]);

      const [assignData, activityData] = await Promise.all([
        assignRes.json(),
        activityRes.json(),
      ]);

      if (assignData.success) setAssignments(assignData.data);
      if (activityData.success) setActivities(activityData.data);
    } catch (error) {
      console.error('Error loading staff teaching data:', error);
    } finally {
      setLoading(false);
    }
  }, [staffId, rangeDays]);

  useEffect(() => {
    loadTeachingData();
  }, [loadTeachingData]);

  const todayKey = new Date().toISOString().split('T')[0];
  const todayActivities = useMemo(
    () =>
      activities.filter((a) => String(a.activity_date).slice(0, 10) === todayKey),
    [activities, todayKey],
  );

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        Loading teaching assignments and activity...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FiBook className="h-4 w-4 text-primary-600" />
            Assigned Classes & Subjects
          </h3>
          <Link
            href="/academics/teacher-assignments"
            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"
          >
            Manage assignments
            <FiExternalLink size={12} />
          </Link>
        </div>

        {assignments.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            No class or subject assignments found for this staff member.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">
                    Class
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">
                    Section
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">
                    Subject
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">
                    Year
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.class_name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.section_name || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.subject_name || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.academic_year}</td>
                    <td className="px-4 py-2.5">
                      {row.is_class_teacher ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-100 text-primary-800">
                          Class Teacher
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FiCalendar className="h-4 w-4 text-primary-600" />
            Daily Activity
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(parseInt(e.target.value, 10))}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-900"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <Link
              href="/teachers/daily-activities"
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"
            >
              View all logs
              <FiExternalLink size={12} />
            </Link>
          </div>
        </div>

        {todayActivities.length > 0 && (
          <div className="border-b border-primary-100 bg-primary-50/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-2">
              Today
            </p>
            <div className="space-y-2">
              {todayActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {activity.class_name || '—'}
                      {activity.section_name ? ` · ${activity.section_name}` : ''}
                    </span>
                    {activity.subject_name && (
                      <span className="text-gray-500">· {activity.subject_name}</span>
                    )}
                    <span
                      className={`ml-auto inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${statusBadgeClass(activity.status)}`}
                    >
                      {activity.status}
                    </span>
                  </div>
                  {activity.topic_covered && (
                    <p className="mt-1 text-xs text-gray-600">{activity.topic_covered}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activities.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            No daily activity logged in the selected period.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">Class</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">
                    Subject
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">Topic</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">
                    Periods
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                      {formatActivityDate(String(activity.activity_date))}
                    </td>
                    <td className="px-4 py-2.5 text-gray-900">
                      {activity.class_name || '—'}
                      {activity.section_name ? (
                        <span className="text-gray-500"> · {activity.section_name}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{activity.subject_name || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-[180px] truncate">
                      {activity.topic_covered || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{activity.periods_taught}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${statusBadgeClass(activity.status)}`}
                      >
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
