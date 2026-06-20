'use client';

type RankRow = {
  student_id?: number;
  first_name: string;
  last_name: string;
  percentage: number | string;
  overall_grade?: string | null;
  result_status?: string;
  class_rank?: number | null;
  section_rank?: number | null;
  school_rank?: number | null;
};

interface RankingTableProps {
  rows: RankRow[];
  compact?: boolean;
  limit?: number;
  showSchoolRank?: boolean;
}

export default function RankingTable({
  rows,
  compact,
  limit,
  showSchoolRank = true,
}: RankingTableProps) {
  const display = limit ? rows.slice(0, limit) : rows;

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className={`w-full ${compact ? 'text-xs' : 'text-sm'}`}>
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left">Class Rank</th>
            {showSchoolRank && <th className="px-3 py-2 text-left">School Rank</th>}
            <th className="px-3 py-2 text-left">Student</th>
            <th className="px-3 py-2 text-right">%</th>
            <th className="px-3 py-2 text-center">Grade</th>
            <th className="px-3 py-2 text-center">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {display.map((row) => (
            <tr key={row.student_id ?? `${row.first_name}-${row.class_rank}`}>
              <td className="px-3 py-2 font-medium text-gray-700">
                {row.class_rank != null ? `#${row.class_rank}` : '—'}
              </td>
              {showSchoolRank && (
                <td className="px-3 py-2 text-gray-600">
                  {row.school_rank != null ? `#${row.school_rank}` : '—'}
                </td>
              )}
              <td className="px-3 py-2">
                {row.first_name} {row.last_name}
              </td>
              <td className="px-3 py-2 text-right">{Number(row.percentage).toFixed(1)}%</td>
              <td className="px-3 py-2 text-center font-medium">{row.overall_grade || '—'}</td>
              <td className="px-3 py-2 text-center">
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    row.result_status === 'PASS'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {row.result_status || '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
