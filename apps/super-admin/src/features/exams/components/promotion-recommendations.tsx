'use client';

import { useEffect, useState } from 'react';

type RecRow = {
  student_id: number;
  first_name: string;
  last_name: string;
  recommendation: 'PROMOTE' | 'DETAIN' | 'REVIEW';
  percentage: number | string;
  failed_subjects: number;
  class_name: string;
};

interface PromotionRecommendationsProps {
  classId?: string;
  examId?: number;
}

export default function PromotionRecommendations({ classId, examId }: PromotionRecommendationsProps) {
  const [grouped, setGrouped] = useState<{
    PROMOTE: RecRow[];
    DETAIN: RecRow[];
    REVIEW: RecRow[];
  } | null>(null);

  useEffect(() => {
    if (!classId && !examId) return;
    const params = new URLSearchParams();
    if (classId) params.set('class_id', classId);
    if (examId) params.set('exam_id', String(examId));
    fetch(`/api/promotion-recommendations?${params}`)
      .then((r) => r.json())
      .then((d) => d.success && setGrouped(d.grouped));
  }, [classId, examId]);

  if (!grouped) return null;
  const total = grouped.PROMOTE.length + grouped.DETAIN.length + grouped.REVIEW.length;
  if (total === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <div className="border rounded-xl p-4 bg-green-50">
        <h4 className="text-sm font-semibold text-green-800 mb-2">
          Eligible for Promotion ({grouped.PROMOTE.length})
        </h4>
        <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
          {grouped.PROMOTE.slice(0, 15).map((r) => (
            <li key={r.student_id} className="flex justify-between gap-2">
              <span>{r.first_name} {r.last_name}</span>
              <span className="text-gray-500 shrink-0">{Number(r.percentage).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border rounded-xl p-4 bg-red-50">
        <h4 className="text-sm font-semibold text-red-800 mb-2">
          Detained ({grouped.DETAIN.length})
        </h4>
        <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
          {grouped.DETAIN.slice(0, 15).map((r) => (
            <li key={r.student_id} className="flex justify-between gap-2">
              <span>{r.first_name} {r.last_name}</span>
              <span className="text-gray-500 shrink-0">{Number(r.percentage).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border rounded-xl p-4 bg-amber-50">
        <h4 className="text-sm font-semibold text-amber-800 mb-2">
          Manual Review ({grouped.REVIEW.length})
        </h4>
        <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
          {grouped.REVIEW.slice(0, 15).map((r) => (
            <li key={r.student_id} className="flex justify-between gap-2">
              <span>{r.first_name} {r.last_name}</span>
              <span className="text-gray-500 shrink-0">{Number(r.percentage).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
