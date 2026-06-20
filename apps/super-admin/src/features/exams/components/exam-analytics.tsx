'use client';

import type { ExamAnalytics } from '@/services/exams/exam-analytics';
import RankingTable from '@/features/exams/components/ranking-table';

export default function ExamAnalyticsPanel({ data }: { data: ExamAnalytics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pass %', value: `${data.pass_percentage}%`, className: 'text-green-700' },
          { label: 'Fail %', value: `${data.fail_percentage}%`, className: 'text-red-700' },
          { label: 'Average', value: `${data.average_score}%`, className: 'text-blue-700' },
          { label: 'Highest', value: `${data.highest_score}%`, className: 'text-indigo-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className={`text-xl font-semibold ${kpi.className}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {data.weakest_subject && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900">
          Weakest subject: <strong>{data.weakest_subject.subject_name}</strong> (
          {data.weakest_subject.avg_percentage}% avg)
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Top 10 — Class</h3>
          <RankingTable
            rows={data.top_class_performers.map((r) => ({
              first_name: r.name.split(' ')[0] || r.name,
              last_name: r.name.split(' ').slice(1).join(' '),
              percentage: r.percentage,
              class_rank: r.class_rank,
              result_status: 'PASS',
            }))}
            compact
          />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Subject Performance</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Subject</th>
                  <th className="px-3 py-2 text-right">Avg %</th>
                  <th className="px-3 py-2 text-right">Pass rate</th>
                </tr>
              </thead>
              <tbody>
                {data.subject_performance.map((s) => (
                  <tr key={s.subject_id} className="border-t">
                    <td className="px-3 py-2">{s.subject_name}</td>
                    <td className="px-3 py-2 text-right">{s.avg_percentage}%</td>
                    <td className="px-3 py-2 text-right">{s.pass_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data.students_at_risk.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-800 mb-2">Students At Risk</h3>
          <ul className="text-sm space-y-1">
            {data.students_at_risk.slice(0, 10).map((s) => (
              <li key={s.student_id} className="flex justify-between border-b py-1">
                <span>{s.name}</span>
                <span className="text-red-600">
                  {s.percentage}% · {s.failed_subjects} failed
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
