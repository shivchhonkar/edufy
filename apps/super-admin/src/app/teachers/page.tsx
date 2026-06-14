'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TeacherNav from '@/features/teachers/components/TeacherNav';
import { FiActivity, FiAward, FiBook, FiCalendar, FiTrendingUp, FiUsers } from 'react-icons/fi';

const cards = [
  { href: '/hr/teacher-assignments', title: 'Subject Assignment', desc: 'Assign teachers to classes, sections, and subjects', icon: FiUsers, color: 'bg-blue-50 text-blue-600' },
  { href: '/teachers/timetable', title: 'Teacher Timetable', desc: 'View weekly schedule per teacher', icon: FiCalendar, color: 'bg-green-50 text-green-600' },
  { href: '/teachers/daily-activities', title: 'Daily Activities', desc: 'Log topics taught, periods, and homework', icon: FiActivity, color: 'bg-purple-50 text-purple-600' },
  { href: '/teachers/performance', title: 'Performance Dashboard', desc: 'KPIs across activities, syllabus, and homework', icon: FiTrendingUp, color: 'bg-amber-50 text-amber-600' },
  { href: '/teachers/ranking', title: 'Top Teacher Ranking', desc: 'Leaderboard based on composite performance score', icon: FiAward, color: 'bg-rose-50 text-rose-600' },
  { href: '/teachers/syllabus', title: 'Syllabus Progress', desc: 'Track chapter completion by class and subject', icon: FiBook, color: 'bg-teal-50 text-teal-600' },
];

export default function TeachersPage() {
  const [summary, setSummary] = useState<{ total_teachers: number; avg_score: number; top_teacher: { teacher_name: string; score: number } | null } | null>(null);

  useEffect(() => {
    fetch('/api/teachers/performance')
      .then((r) => r.json())
      .then((d) => d.success && setSummary(d.data.summary));
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <TeacherNav />
        <h1 className="text-xl mb-2">Teachers</h1>
        <p className="text-sm text-gray-600 mb-6">Manage teaching assignments, track daily work, and monitor performance.</p>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Active Teachers</p>
              <p className="text-2xl font-bold mt-1">{summary.total_teachers}</p>
            </div>
            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Avg Performance Score</p>
              <p className="text-2xl font-bold mt-1">{summary.avg_score}<span className="text-sm font-normal text-gray-400">/100</span></p>
            </div>
            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Top Teacher</p>
              <p className="text-lg font-bold mt-1">{summary.top_teacher?.teacher_name || '—'}</p>
              {summary.top_teacher && <p className="text-xs text-gray-500">Score: {summary.top_teacher.score}</p>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className={`inline-flex p-2 rounded-lg ${card.color} mb-3`}>
                <card.icon className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-gray-900">{card.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
