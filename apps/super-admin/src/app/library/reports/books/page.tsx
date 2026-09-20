'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import { printHtmlDocument } from '@/features/students/utils/print-html';

interface BookRow {
  id: number;
  accession_no?: string;
  barcode?: string;
  title: string;
  author?: string;
  publisher?: string;
  subject_name?: string;
  category_name?: string;
  isbn?: string;
  status: string;
}

export default function BooksRegisterPage() {
  const [rows, setRows] = useState<BookRow[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/library/reports?type=books');
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((row) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [row.title, row.author, row.accession_no, row.barcode, row.isbn, row.subject_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  const print = () => {
    printHtmlDocument(
      'Books Register',
      `<h1>Books Register</h1>
       <p class="muted">${filtered.length} copies</p>
       <table>
         <thead><tr><th>Accession</th><th>Barcode</th><th>Title</th><th>Author</th><th>Subject</th><th>ISBN</th><th>Status</th></tr></thead>
         <tbody>${filtered
           .map(
             (row) =>
               `<tr><td>${row.accession_no || ''}</td><td>${row.barcode || ''}</td><td>${row.title}</td><td>${row.author || ''}</td><td>${row.subject_name || ''}</td><td>${row.isbn || ''}</td><td>${row.status}</td></tr>`
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
            <h1 className="text-lg font-medium text-gray-900">Book Register</h1>
            <p className="mt-1 text-sm text-gray-500">Accession-wise list of every copy in the catalog.</p>
          </div>
          <button type="button" onClick={print} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
            Print
          </button>
        </div>
        <LibraryModuleLinks />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, author, accession, barcode..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Accession</th>
                <th className="px-3 py-2">Barcode</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Author</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">No books in register</td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{row.accession_no || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.barcode || '—'}</td>
                    <td className="px-3 py-2 font-medium">{row.title}</td>
                    <td className="px-3 py-2">{row.author || '—'}</td>
                    <td className="px-3 py-2">{row.subject_name || '—'}</td>
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
