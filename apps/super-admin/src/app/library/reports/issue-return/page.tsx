'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import { printHtmlDocument } from '@/features/students/utils/print-html';

interface IssueRow {
  id: number;
  issued_at: string;
  due_at: string;
  returned_at?: string | null;
  status: string;
  borrower_type: string;
  borrower_name?: string;
  fine_amount?: string | number;
  book?: { title?: string };
  copy?: { barcode?: string; accession_no?: string };
}

export default function IssueReturnRegisterPage() {
  const [rows, setRows] = useState<IssueRow[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [borrowerType, setBorrowerType] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams({ type: 'issue-return' });
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    if (borrowerType) params.set('borrower_type', borrowerType);
    const res = await fetch(`/api/library/reports?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, [fromDate, toDate, borrowerType]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const print = () => {
    printHtmlDocument(
      'Issue-Return Register',
      `<h1>Issue-Return Register</h1>
       <table>
         <thead><tr><th>Issued</th><th>Due</th><th>Returned</th><th>Borrower</th><th>Type</th><th>Title</th><th>Barcode</th><th>Fine</th><th>Status</th></tr></thead>
         <tbody>${rows
           .map(
             (row) =>
               `<tr><td>${String(row.issued_at).slice(0, 10)}</td><td>${String(row.due_at).slice(0, 10)}</td><td>${row.returned_at ? String(row.returned_at).slice(0, 10) : ''}</td><td>${row.borrower_name || ''}</td><td>${row.borrower_type}</td><td>${row.book?.title || ''}</td><td>${row.copy?.barcode || ''}</td><td>${row.fine_amount || 0}</td><td>${row.status}</td></tr>`
           )
           .join('')}</tbody>
       </table>`
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Issue & Return Register</h1>
            <p className="mt-1 text-sm text-gray-500">Complete circulation history for students and staff.</p>
          </div>
          <button type="button" onClick={print} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
            Print
          </button>
        </div>
        <LibraryModuleLinks />
        <div className="flex flex-wrap gap-2">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <select value={borrowerType} onChange={(e) => setBorrowerType(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">All borrowers</option>
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Issued</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Returned</th>
                <th className="px-3 py-2">Borrower</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Barcode</th>
                <th className="px-3 py-2">Fine</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500">No circulation records</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">{String(row.issued_at).slice(0, 10)}</td>
                    <td className="px-3 py-2">{String(row.due_at).slice(0, 10)}</td>
                    <td className="px-3 py-2">{row.returned_at ? String(row.returned_at).slice(0, 10) : '—'}</td>
                    <td className="px-3 py-2">
                      {row.borrower_name || '—'}
                      <span className="ml-1 text-xs text-gray-400 capitalize">({row.borrower_type})</span>
                    </td>
                    <td className="px-3 py-2 font-medium">{row.book?.title || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.copy?.barcode || '—'}</td>
                    <td className="px-3 py-2">₹ {Number(row.fine_amount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 capitalize">{row.status}</td>
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
