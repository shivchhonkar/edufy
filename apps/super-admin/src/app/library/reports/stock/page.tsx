'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import { printHtmlDocument } from '@/features/students/utils/print-html';

interface Book {
  id: number;
  title: string;
  author?: string | null;
  isbn?: string | null;
  total_copies?: number;
  copies?: { status: string }[];
}

export default function StockReportPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/library/books', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setBooks(data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = books
    .map((book) => {
      const copies = book.copies || [];
      const available = copies.filter((c) => c.status === 'available').length;
      const issued = copies.filter((c) => c.status === 'issued').length;
      const lost = copies.filter((c) => c.status === 'lost' || c.status === 'damaged').length;
      const total = copies.length || book.total_copies || 0;
      return { ...book, available, issued, lost, total };
    })
    .filter((row) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return [row.title, row.author, row.isbn].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    });

  const print = () => {
    printHtmlDocument(
      'Stock Report',
      `<h1>Stock Report</h1>
       <table>
         <thead><tr><th>Title</th><th>Author</th><th>ISBN</th><th>Total</th><th>Available</th><th>Issued</th><th>Lost/Damaged</th></tr></thead>
         <tbody>${rows
           .map(
             (row) =>
               `<tr><td>${row.title}</td><td>${row.author || ''}</td><td>${row.isbn || ''}</td><td>${row.total}</td><td>${row.available}</td><td>${row.issued}</td><td>${row.lost}</td></tr>`
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
            <h1 className="text-lg font-medium text-gray-900">Stock Report</h1>
            <p className="mt-1 text-sm text-gray-500">Title-wise available, issued and lost copies.</p>
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
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, author or ISBN..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white" aria-busy={loading}>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Author</th>
                <th className="px-3 py-2">ISBN</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Available</th>
                <th className="px-3 py-2">Issued</th>
                <th className="px-3 py-2">Lost / Damaged</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="border-t">
                    {Array.from({ length: 7 }).map((__, col) => (
                      <td key={col} className="px-3 py-3">
                        <div className="h-3 w-20 max-w-full animate-pulse rounded bg-gray-200/90" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    No stock records
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{row.title}</td>
                    <td className="px-3 py-2">{row.author || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.isbn || '—'}</td>
                    <td className="px-3 py-2">{row.total}</td>
                    <td className="px-3 py-2 font-medium text-emerald-700">{row.available}</td>
                    <td className="px-3 py-2 font-medium text-amber-700">{row.issued}</td>
                    <td className="px-3 py-2">{row.lost}</td>
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
