'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiBook, FiShoppingBag } from 'react-icons/fi';
import { formatStudentDate } from '@/features/students/utils/student-profile';
import { inventoryItemLabel } from '@/features/inventory/item-label';

type PurchaseItem = {
  item_name?: string | null;
  size?: string | null;
  item_code?: string | null;
  unit?: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
};

type PurchaseRow = {
  id: number;
  doc_no: string;
  doc_date: string;
  kind: string;
  status: string;
  remarks?: string | null;
  total: number;
  items: PurchaseItem[];
};

type LibraryRow = {
  id: number;
  title?: string;
  author?: string | null;
  isbn?: string | null;
  barcode?: string | null;
  accession_no?: string | null;
  issued_at?: string;
  due_at?: string | null;
  returned_at?: string | null;
  status?: string;
  fine_amount?: number | string | null;
};

function money(amount: number) {
  return `₹ ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function kindLabel(kind: string) {
  if (kind === 'sale') return 'Sale';
  if (kind === 'issue') return 'Issue';
  if (kind === 'return') return 'Return';
  return kind;
}

function libraryStatusClass(status?: string) {
  if (status === 'issued') return 'bg-amber-100 text-amber-800';
  if (status === 'returned') return 'bg-green-100 text-green-800';
  if (status === 'overdue') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

export default function ActivityTab({ studentId }: { studentId: number }) {
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [library, setLibrary] = useState<LibraryRow[]>([]);
  const [purchaseTotal, setPurchaseTotal] = useState(0);
  const [libraryIssued, setLibraryIssued] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}/activity`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setPurchases(data.data.purchases || []);
        setLibrary(data.data.library || []);
        setPurchaseTotal(Number(data.data.purchase_total || 0));
        setLibraryIssued(Number(data.data.library_issued || 0));
      } else {
        setPurchases([]);
        setLibrary([]);
      }
    } catch {
      setPurchases([]);
      setLibrary([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-500">Loading activity...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-medium text-gray-500">Purchases</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{money(purchaseTotal)}</p>
          <p className="text-xs text-gray-500">{purchases.length} invoice{purchases.length === 1 ? '' : 's'}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-medium text-gray-500">Library books out</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{libraryIssued}</p>
          <p className="text-xs text-gray-500">{library.length} issue{library.length === 1 ? '' : 's'} in history</p>
        </div>
      </div>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
          <FiShoppingBag className="text-primary-600" />
          Purchase history
        </h3>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                    No uniform or inventory purchases yet
                  </td>
                </tr>
              ) : (
                purchases.map((row) => (
                  <tr key={row.id} className="border-t align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {formatStudentDate(row.doc_date)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.doc_no}</td>
                    <td className="px-3 py-2">
                      <ul className="space-y-0.5">
                        {row.items.map((item, index) => (
                          <li key={index}>
                            {inventoryItemLabel(item)} × {item.quantity}
                            {item.unit ? ` ${item.unit}` : ''}
                            <span className="text-gray-500"> · {money(item.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-3 py-2 capitalize">{kindLabel(row.kind)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{money(row.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
          <FiBook className="text-primary-600" />
          Library activity
        </h3>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Book</th>
                <th className="px-3 py-2">Issued</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Returned</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Fine</th>
              </tr>
            </thead>
            <tbody>
              {library.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    No library issues yet
                  </td>
                </tr>
              ) : (
                library.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{row.title || 'Book'}</p>
                      <p className="text-xs text-gray-500">
                        {[row.author, row.accession_no || row.barcode].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {formatStudentDate(row.issued_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {formatStudentDate(row.due_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {row.returned_at ? formatStudentDate(row.returned_at) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${libraryStatusClass(row.status)}`}>
                        {row.status || '—'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {Number(row.fine_amount || 0) > 0 ? money(Number(row.fine_amount)) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
