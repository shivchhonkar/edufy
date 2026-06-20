'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ExamAnalyticsPanel from '@/features/exams/components/exam-analytics';
import type { ExamAnalytics } from '@/services/exams/exam-analytics';
import { FiArrowLeft, FiBarChart2 } from 'react-icons/fi';

interface ExamOption {
  id: number;
  name: string;
  class_name: string;
  exam_type: string;
}

export default function ExamAnalyticsPage() {
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [examId, setExamId] = useState('');
  const [analytics, setAnalytics] = useState<ExamAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/exams')
      .then((r) => r.json())
      .then((d) => d.success && setExams(d.data));
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/analytics?exam_id=${examId}`);
      const data = await res.json();
      if (data.success) setAnalytics(data.data);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/exams" className="text-gray-500 hover:text-gray-800">
            <FiArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl text-gray-900 flex items-center gap-2">
              <FiBarChart2 className="text-primary-600" /> Exam Analytics
            </h1>
            <p className="text-sm text-gray-500">Performance insights from compiled results</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end bg-white border rounded-xl p-4">
          <label className="block text-sm flex-1 min-w-[200px]">
            <span className="text-gray-600 text-xs">Select exam</span>
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Choose exam...</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.class_name} ({e.exam_type})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={loadAnalytics}
            disabled={!examId || loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load Analytics'}
          </button>
        </div>

        {analytics && <ExamAnalyticsPanel data={analytics} />}
        {!analytics && !loading && (
          <p className="text-center text-gray-500 text-sm py-12">
            Compile results for an exam first, then load analytics here.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
