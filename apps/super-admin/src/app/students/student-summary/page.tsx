'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPrinter } from 'react-icons/fi';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { printHtmlDocument } from '@/features/students/utils/print-html';
import { formatStudentDate, studentFullName } from '@/features/students/utils/student-profile';

interface StudentSummaryRow {
  id: number;
  admission_number: string;
  first_name: string;
  last_name: string;
  gender?: string | null;
  date_of_birth?: string | null;
  admission_date?: string | null;
  category?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  class_name?: string | null;
  section_name?: string | null;
  roll_number?: string | null;
  address?: string | null;
}

export default function StudentSummaryPage() {
  const [rows, setRows] = useState<StudentSummaryRow[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [classId, setClassId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/classes?active_only=true')
      .then((r) => r.json())
      .then((d) => d.success && setClasses(d.data || []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ view: 'students', status: 'active' });
    if (classId) params.set('class_id', classId);
    if (search) params.set('search', search);
    const res = await fetch(`/api/students/summaries?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
    setLoading(false);
  }, [classId, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const printReport = () => {
    printHtmlDocument(
      'Student Register',
      `<h1>Student Register</h1>
       <table>
         <thead><tr><th>Adm. No.</th><th>Name</th><th>Class</th><th>Gender</th><th>DOB</th><th>Parent</th><th>Phone</th></tr></thead>
         <tbody>
           ${rows
             .map(
               (row) =>
                 `<tr><td>${row.admission_number}</td><td>${studentFullName(row)}</td><td>${
                   [row.class_name, row.section_name].filter(Boolean).join(' - ')
                 }</td><td>${row.gender || ''}</td><td>${row.date_of_birth || ''}</td><td>${
                   row.parent_name || ''
                 }</td><td>${row.parent_phone || ''}</td></tr>`
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
            <h1 className="text-lg font-medium text-gray-900">Student Register</h1>
            <p className="mt-1 text-sm text-gray-500">Printable student-wise register with class and parent details.</p>
          </div>
          <button type="button" onClick={printReport} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm">
            <FiPrinter /> Print
          </button>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <select
            className="w-52 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student"
          />
        </div>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Adm. No.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Class</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Gender</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">DOB</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Parent</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-2.5 font-mono text-xs">{row.admission_number}</td>
                    <td className="px-4 py-2.5 font-medium">{studentFullName(row)}</td>
                    <td className="px-4 py-2.5">{[row.class_name, row.section_name].filter(Boolean).join(' - ') || '—'}</td>
                    <td className="px-4 py-2.5">{row.gender || '—'}</td>
                    <td className="px-4 py-2.5">{formatStudentDate(row.date_of_birth)}</td>
                    <td className="px-4 py-2.5">
                      {row.parent_name || '—'}
                      <div className="text-xs text-gray-500">{row.parent_phone}</div>
                    </td>
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
