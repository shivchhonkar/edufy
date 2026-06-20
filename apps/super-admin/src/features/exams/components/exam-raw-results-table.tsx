'use client';

import { useMemo, useState } from 'react';
import { FiCheckCircle, FiDownload, FiFileText, FiXCircle } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';
import {
  downloadExamResultsExcel,
  downloadExamResultsPdf,
  getResultStatus,
  groupExamResultsByStudent,
  type ExamExportContext,
  type ExamResultRow,
} from '@/features/exams/utils/exam-results-export';

interface ExamRawResultsTableProps {
  exam: ExamExportContext;
  results: ExamResultRow[];
}

export default function ExamRawResultsTable({ exam, results }: ExamRawResultsTableProps) {
  const { alert } = useDialog();
  const [exportingPdf, setExportingPdf] = useState(false);

  const groupedResults = useMemo(() => groupExamResultsByStudent(results), [results]);

  const handleExportExcel = () => {
    downloadExamResultsExcel(results, exam);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await downloadExamResultsPdf(results, exam);
    } catch (error) {
      console.error('Error exporting exam results PDF:', error);
      await alert('Failed to generate PDF. Please try again.', { title: 'Export failed', type: 'error' });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-gray-900">Student Results (Raw Marks)</h4>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <FiDownload size={14} />
            Download Excel
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <FiFileText size={14} />
            {exportingPdf ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-center px-4 py-3 font-medium text-gray-700 w-40">Student</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Subject</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Marks</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">%</th>
              <th className="text-center px-4 py-3 font-medium text-gray-700">Grade</th>
              <th className="text-center px-4 py-3 font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {groupedResults.map((group) =>
              group.results.map((result, index) => {
                const passed = getResultStatus(result, exam) === 'Pass';
                return (
                  <tr key={result.id} className="border-b last:border-0 hover:bg-gray-50">
                    {index === 0 && (
                        <td
                          rowSpan={group.results.length}
                          className="px-4 py-3 text-center align-middle border-r border-gray-100 bg-gray-50/50"
                        >
                          <div className="flex flex-col items-center justify-center min-h-[2.5rem]">
                            <span className="font-medium text-gray-900">
                              {group.first_name} {group.last_name}
                            </span>
                            {group.admission_number && (
                              <span className="text-xs text-gray-500 mt-0.5">{group.admission_number}</span>
                            )}
                          </div>
                        </td>
                    )}
                    <td className="px-4 py-3 text-gray-600">{result.subject_name || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {result.is_absent ? '—' : result.marks_obtained}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {result.is_absent ? '—' : `${result.percentage}%`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {result.is_absent ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {result.grade}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {result.is_absent ? (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">Absent</span>
                      ) : passed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                          <FiCheckCircle className="w-3 h-3" /> Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">
                          <FiXCircle className="w-3 h-3" /> Fail
                        </span>
                      )}
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
