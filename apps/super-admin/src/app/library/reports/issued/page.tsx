'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import { printHtmlDocument } from '@/features/students/utils/print-html';

interface IssueRow {
  id: number;
  issued_at: string;
  due_at: string;
  borrower_type: string;
  borrower_name?: string;
  book?: { title?: string; author?: string };
  copy?: { barcode?: string; accession_no?: string };
}

function IssuedBooksTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white" aria-busy="true" aria-live="polite">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Borrower</th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Accession</th>
            <th className="px-3 py-2">Issued</th>
            <th className="px-3 py-2">Due</th>
            <th className="px-3 py-2">Overdue</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, index) => (
            <tr key={index} className="border-t">
              <td className="px-3 py-3">
                <div className="h-3.5 w-36 max-w-full animate-pulse rounded bg-gray-200/90" />
                <div className="mt-1.5 h-2.5 w-16 animate-pulse rounded bg-gray-100" />
              </td>
              <td className="px-3 py-3">
                <div className="h-3.5 w-44 max-w-full animate-pulse rounded bg-gray-200/90" />
              </td>
              <td className="px-3 py-3">
                <div className="h-3 w-24 animate-pulse rounded bg-gray-200/90" />
              </td>
              <td className="px-3 py-3">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200/90" />
              </td>
              <td className="px-3 py-3">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200/90" />
              </td>
              <td className="px-3 py-3">
                <div className="h-3 w-10 animate-pulse rounded bg-gray-200/90" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function IssuedBooksReportPage() {
  const [rows, setRows] = useState<IssueRow[]>([]);
  const [borrowerType, setBorrowerType] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'issued' });
      if (borrowerType) params.set('borrower_type', borrowerType);
      const res = await fetch(`/api/library/reports?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [borrowerType]);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const print = () => {
    printHtmlDocument(
      'Issued Books',
      `<h1>Issued Books</h1>
       <table>
         <thead><tr><th>Borrower</th><th>Type</th><th>Title</th><th>Accession</th><th>Issued</th><th>Due</th><th>Overdue</th></tr></thead>
         <tbody>${rows
           .map((row) => {
             const overdue = String(row.due_at).slice(0, 10) < today ? 'Yes' : '';
             return `<tr><td>${row.borrower_name || ''}</td><td>${row.borrower_type}</td><td>${row.book?.title || ''}</td><td>${row.copy?.accession_no || ''}</td><td>${String(row.issued_at).slice(0, 10)}</td><td>${String(row.due_at).slice(0, 10)}</td><td>${overdue}</td></tr>`;
           })
           .join('')}</tbody>
       </table>`
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Issued Books</h1>
            <p className="mt-1 text-sm text-gray-500">Copies currently out with students or staff.</p>
          </div>
          <button
            type="button"
            onClick={print}
            disabled={loading || rows.length === 0}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Print
          </button>
        </div>
        <LibraryModuleLinks />
        <select value={borrowerType} onChange={(e) => setBorrowerType(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="">All borrowers</option>
          <option value="student">Student</option>
          <option value="staff">Staff</option>
        </select>
        {loading ? (
          <IssuedBooksTableSkeleton />
        ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Borrower</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Accession</th>
                <th className="px-3 py-2">Issued</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">No books currently issued</td>
                </tr>
              ) : (
                rows.map((row) => {
                  const overdue = String(row.due_at).slice(0, 10) < today;
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2">
                        {row.borrower_name || '—'}
                        <span className="ml-1 text-xs text-gray-400 capitalize">({row.borrower_type})</span>
                      </td>
                      <td className="px-3 py-2 font-medium">{row.book?.title || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.copy?.accession_no || row.copy?.barcode || '—'}</td>
                      <td className="px-3 py-2">{String(row.issued_at).slice(0, 10)}</td>
                      <td className="px-3 py-2">{String(row.due_at).slice(0, 10)}</td>
                      <td className={`px-3 py-2 ${overdue ? 'font-medium text-red-600' : 'text-gray-500'}`}>
                        {overdue ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
