'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TeacherNav from '@/features/teachers/components/TeacherNav';
import { FiAward } from 'react-icons/fi';

interface RankedTeacher {
  rank: number;
  staff_id: number;
  teacher_name: string;
  score: number;
  activity_count: number;
  syllabus_progress_pct: number;
  homework_count: number;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export default function TeacherRankingPage() {
  const [ranking, setRanking] = useState<RankedTeacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/teachers/performance?days=30')
      .then((r) => r.json())
      .then((d) => d.success && setRanking(d.data.ranking))
      .finally(() => setLoading(false));
  }, []);

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <TeacherNav />
        <h1 className="text-xl flex items-center gap-2 mb-2"><FiAward className="text-amber-500" /> Top Teacher Ranking</h1>
        <p className="text-sm text-gray-600 mb-8">Leaderboard based on 30-day composite performance score</p>

        {loading && <p className="text-center text-gray-400 py-12">Loading rankings...</p>}

        {!loading && ranking.length === 0 && (
          <p className="text-center text-gray-400 py-12 bg-gray-50 border rounded-xl">No rankings yet. Teachers appear after logging activities or timetable assignments.</p>
        )}

        {!loading && top3.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {top3.map((t, i) => (
              <div
                key={t.staff_id}
                className={`bg-white border rounded-xl p-6 text-center shadow-sm ${i === 0 ? 'ring-2 ring-amber-300 sm:order-2' : i === 1 ? 'sm:order-1' : 'sm:order-3'}`}
              >
                <div className="text-3xl mb-2">{MEDAL[i]}</div>
                <p className="text-xs text-gray-500 uppercase">Rank #{t.rank}</p>
                <p className="font-bold text-lg mt-1">{t.teacher_name}</p>
                <p className="text-2xl font-bold text-primary-600 mt-2">{t.score}</p>
                <p className="text-xs text-gray-500 mt-2">{t.activity_count} activities · {t.syllabus_progress_pct}% syllabus</p>
              </div>
            ))}
          </div>
        )}

        {!loading && rest.length > 0 && (
          <div className="bg-white border rounded-xl shadow-sm divide-y">
            {rest.map((t) => (
              <div key={t.staff_id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">#{t.rank}</span>
                  <div>
                    <p className="font-medium">{t.teacher_name}</p>
                    <p className="text-xs text-gray-500">{t.activity_count} activities · {t.homework_count} homework</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-700">{t.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
