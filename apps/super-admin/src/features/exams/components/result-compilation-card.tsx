'use client';

import { useEffect, useState } from 'react';
import RankingTable from '@/features/exams/components/ranking-table';

interface ResultCompilationCardProps {
  examId: number;
  open: boolean;
}

type SummaryRow = {
  student_id: number;
  first_name: string;
  last_name: string;
  percentage: number | string;
  overall_grade: string;
  result_status: string;
  class_rank: number | null;
  section_rank: number | null;
  school_rank: number | null;
};

export default function ResultCompilationCard({ examId, open }: ResultCompilationCardProps) {
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [meta, setMeta] = useState<{ pass_count?: string; fail_count?: string; avg_percentage?: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/exams/${examId}/summaries`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSummaries(data.data);
          setMeta(data.meta || {});
        }
      })
      .finally(() => setLoading(false));
  }, [examId, open]);

  if (!open) return null;

  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading compiled summaries...</div>;
  }

  if (summaries.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-3 bg-gray-50 rounded-lg px-3 mt-3">
        No compiled summaries yet. Enter marks, then click <strong>Compile Results</strong>.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="px-2 py-1 rounded bg-green-50 text-green-800">
          Pass: {meta.pass_count ?? '—'}
        </span>
        <span className="px-2 py-1 rounded bg-red-50 text-red-800">
          Fail: {meta.fail_count ?? '—'}
        </span>
        <span className="px-2 py-1 rounded bg-blue-50 text-blue-800">
          Avg: {meta.avg_percentage ? `${Number(meta.avg_percentage).toFixed(1)}%` : '—'}
        </span>
      </div>
      <RankingTable rows={summaries} compact limit={10} />
    </div>
  );
}
