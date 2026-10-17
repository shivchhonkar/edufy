'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPrinter } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { printHtmlDocument } from '@/features/students/utils/print-html';
import { STUDENT_OPS_INPUT } from '@/features/students/components/StudentPickSelect';

interface ClassSummaryRow {
  class_id: number | null;
  class_name: string | null;
  section_id: number | null;
  section_name: string | null;
  total: number;
  male: number;
  female: number;
  other: number;
  general: number;
  obc: number;
  sc: number;
  st: number;
  ews: number;
}

export default function ClassSummaryPage() {
  const [rows, setRows] = useState<ClassSummaryRow[]>([]);
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ view: 'class', status });
    const res = await fetch(`/api/students/summaries?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const printReport = () => {
    printHtmlDocument(
      'Class Summary',
      `<h1>Class Summary</h1>
       <table>
         <thead><tr><th>Class</th><th>Section</th><th>Total</th><th>Boys</th><th>Girls</th><th>GEN</th><th>OBC</th><th>SC</th><th>ST</th><th>EWS</th></tr></thead>
         <tbody>
           ${rows
             .map(
               (row) =>
                 `<tr><td>${row.class_name || 'Unassigned'}</td><td>${row.section_name || '—'}</td><td>${row.total}</td><td>${row.male}</td><td>${row.female}</td><td>${row.general}</td><td>${row.obc}</td><td>${row.sc}</td><td>${row.st}</td><td>${row.ews}</td></tr>`
             )
             .join('')}
         </tbody>
       </table>`
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Class Summary</h1>
            <p className="mt-1 text-sm text-gray-500">Strength by class, section, gender, and category.</p>
          </div>
          <button type="button" onClick={printReport} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm">
            <FiPrinter /> Print
          </button>
        </div>
        <div className="mb-4">
          <select className={`${STUDENT_OPS_INPUT} w-40`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="transferred">Transferred</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Class</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Section</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Boys</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Girls</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">GEN</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">OBC</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">SC</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">ST</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">EWS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={`${row.class_id}-${row.section_id}-${index}`} className="border-t">
                    <td className="px-4 py-2.5">{row.class_name || 'Unassigned'}</td>
                    <td className="px-4 py-2.5">{row.section_name || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{row.total}</td>
                    <td className="px-4 py-2.5 text-right">{row.male}</td>
                    <td className="px-4 py-2.5 text-right">{row.female}</td>
                    <td className="px-4 py-2.5 text-right">{row.general}</td>
                    <td className="px-4 py-2.5 text-right">{row.obc}</td>
                    <td className="px-4 py-2.5 text-right">{row.sc}</td>
                    <td className="px-4 py-2.5 text-right">{row.st}</td>
                    <td className="px-4 py-2.5 text-right">{row.ews}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
