'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiAward, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { getAuthHeaders, formatParentDate } from '@/lib/client-auth';

interface ExamResult {
  id: number;
  exam_name: string;
  exam_type: string;
  exam_date: string;
  subject_name: string;
  class_name: string;
  marks_obtained: number;
  total_marks: number;
  passing_marks: number;
  percentage: number;
  grade: string;
  result_status: string;
  is_absent: boolean;
}

export default function GradesPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    fetchResults();
  }, [studentId, router]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/results?studentId=${studentId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) setResults(data.data);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const passed = results.filter((r) => r.result_status === 'Pass').length;
  const avgPct =
    results.length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / results.length
        )
      : 0;

  return (
    <div className="p-6 mx-auto">
      <div className="mb-6">
        <h1 className="text-xl text-gray-900">Report Card</h1>
        <p className="text-gray-600 mt-1">Exam performance and grades</p>
      </div>

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Exams</p>
            <p className="text-xl text-gray-900">{results.length}</p>
          </div>
          <div className="bg-white border rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Passed</p>
            <p className="text-xl text-green-700">{passed}</p>
          </div>
          <div className="bg-white border rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Avg %</p>
            <p className="text-xl text-blue-700">{avgPct}%</p>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading report card...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No exam results available yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Exam</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Marks</th>
                <th className="px-4 py-3 text-left">Grade</th>
                <th className="px-4 py-3 text-left">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((result) => (
                <tr key={result.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{result.exam_name}</p>
                    <p className="text-xs text-gray-500">
                      {result.exam_type} · {formatParentDate(result.exam_date)}
                    </p>
                  </td>
                  <td className="px-4 py-3">{result.subject_name}</td>
                  <td className="px-4 py-3">
                    {result.is_absent
                      ? 'Absent'
                      : `${result.marks_obtained} / ${result.total_marks} (${result.percentage}%)`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                      <FiAward size={14} />
                      {result.grade || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                        result.result_status === 'Pass'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {result.result_status === 'Pass' ? <FiCheckCircle /> : <FiXCircle />}
                      {result.result_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
