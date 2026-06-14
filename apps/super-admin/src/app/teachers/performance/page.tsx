'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TeacherNav from '@/features/teachers/components/TeacherNav';

interface TeacherMetric {
  staff_id: number;
  teacher_name: string;
  rank: number;
  score: number;
  activity_count: number;
  periods_logged: number;
  syllabus_progress_pct: number;
  chapters_completed: number;
  chapters_total: number;
  timetable_slots: number;
  homework_count: number;
}

interface Summary {
  total_teachers: number;
  avg_score: number;
  top_teacher: TeacherMetric | null;
  period_days: number;
}

export default function TeacherPerformancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ranking, setRanking] = useState<TeacherMetric[]>([]);
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/teachers/performance?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSummary(d.data.summary);
          setRanking(d.data.ranking);
        }
      })
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <TeacherNav />
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h1 className="text-xl">Teacher Performance Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Composite score from activities, syllabus, timetable, and homework</p>
          </div>
          <select value={days} onChange={(e) => setDays(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Teachers Tracked</p>
              <p className="text-2xl font-bold">{summary.total_teachers}</p>
            </div>
            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Average Score</p>
              <p className="text-2xl font-bold">{summary.avg_score}<span className="text-sm text-gray-400">/100</span></p>
            </div>
            <div className="bg-white border rounded-xl p-4 shadow-sm col-span-2">
              <p className="text-xs text-gray-500 uppercase">Top Performer</p>
              <p className="text-lg font-bold">{summary.top_teacher?.teacher_name || '—'}</p>
              {summary.top_teacher && (
                <p className="text-sm text-gray-500">Score {summary.top_teacher.score} · {summary.top_teacher.activity_count} activities · {summary.top_teacher.syllabus_progress_pct}% syllabus</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3">Rank</th>
                <th className="text-left px-5 py-3">Teacher</th>
                <th className="text-left px-5 py-3">Score</th>
                <th className="text-left px-5 py-3">Activities</th>
                <th className="text-left px-5 py-3">Periods</th>
                <th className="text-left px-5 py-3">Syllabus %</th>
                <th className="text-left px-5 py-3">Chapters</th>
                <th className="text-left px-5 py-3">Timetable</th>
                <th className="text-left px-5 py-3">Homework</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : ranking.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400">No teacher data yet. Log activities and assign timetables to build scores.</td></tr>
              ) : ranking.map((t) => (
                <tr key={t.staff_id} className="border-b">
                  <td className="px-5 py-3 font-medium">#{t.rank}</td>
                  <td className="px-5 py-3">{t.teacher_name}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.score >= 70 ? 'bg-green-100 text-green-800' : t.score >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {t.score}
                    </span>
                  </td>
                  <td className="px-5 py-3">{t.activity_count}</td>
                  <td className="px-5 py-3">{t.periods_logged}</td>
                  <td className="px-5 py-3">{t.syllabus_progress_pct}%</td>
                  <td className="px-5 py-3">{t.chapters_completed}/{t.chapters_total}</td>
                  <td className="px-5 py-3">{t.timetable_slots}</td>
                  <td className="px-5 py-3">{t.homework_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Score weights: activities (30%), syllabus progress (35%), timetable slots (20%), homework assigned (15%).
        </p>
      </div>
    </DashboardLayout>
  );
}
