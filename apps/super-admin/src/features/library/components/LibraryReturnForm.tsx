'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';

interface IssueRow {
  id: number;
  due_at: string;
  issued_at: string;
  borrower_name?: string;
  borrower_type?: string;
  admission_number?: string | null;
  class_name?: string | null;
  book?: { title?: string; isbn?: string; author?: string };
  copy?: { barcode?: string; accession_no?: string };
  member?: { name?: string };
}

interface LibraryReturnFormProps {
  borrowerType: 'student' | 'staff';
}

function daysOverdue(dueAt: string, returnDate: string) {
  const due = new Date(`${dueAt}T00:00:00`);
  const ret = new Date(`${returnDate}T00:00:00`);
  return Math.ceil((ret.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function issueSearchText(issue: IssueRow) {
  return [
    issue.borrower_name,
    issue.member?.name,
    issue.admission_number,
    issue.class_name,
    issue.book?.title,
    issue.book?.author,
    issue.book?.isbn,
    issue.copy?.barcode,
    issue.copy?.accession_no,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function IssuedListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200" aria-busy="true">
      <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium uppercase text-gray-500">
        Loading issued books…
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex gap-4 border-t px-3 py-3">
          <div className="h-3.5 w-40 animate-pulse rounded bg-gray-200/90" />
          <div className="h-3.5 w-48 animate-pulse rounded bg-gray-200/90" />
          <div className="h-3 w-24 animate-pulse rounded bg-gray-200/90" />
        </div>
      ))}
    </div>
  );
}

export default function LibraryReturnForm({ borrowerType }: LibraryReturnFormProps) {
  const { alert, confirm } = useDialog();
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [finePerDay, setFinePerDay] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<IssueRow | null>(null);
  const [returnDate, setReturnDate] = useState('');
  const [fine, setFine] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const borrowerLabel = borrowerType === 'staff' ? 'staff' : 'student';

  const load = async () => {
    setListLoading(true);
    try {
      const [iRes, rRes] = await Promise.all([
        fetch(`/api/library/issues?status=issued&borrower_type=${borrowerType}`, { cache: 'no-store' }),
        fetch('/api/library/fine-rules', { cache: 'no-store' }),
      ]);
      const [iData, rData] = await Promise.all([iRes.json(), rRes.json()]);
      if (iData.success) setIssues(iData.data || []);
      if (rData.success) {
        const rules = rData.data || [];
        const rule =
          rules.find((r: { borrower_type: string }) => r.borrower_type === borrowerType) ||
          rules.find((r: { borrower_type: string }) => r.borrower_type === 'all');
        if (rule) setFinePerDay(parseFloat(String(rule.fine_per_day ?? 10)));
      }
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    load();
    setReturnDate(new Date().toISOString().slice(0, 10));
    setSelected(null);
    setSearchInput('');
    setSuccessMessage('');
  }, [borrowerType]);

  const computeFine = (issue: IssueRow, date: string) => {
    const overdue = daysOverdue(String(issue.due_at).slice(0, 10), date);
    return overdue > 0 ? overdue * finePerDay : 0;
  };

  const filteredIssues = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return issues;
    return issues.filter((issue) => issueSearchText(issue).includes(q));
  }, [issues, searchInput]);

  const selectIssue = (issue: IssueRow) => {
    setSelected(issue);
    setFine(computeFine(issue, returnDate || new Date().toISOString().slice(0, 10)));
    setSuccessMessage('');
  };

  const handleSearch = () => {
    const q = searchInput.trim().toLowerCase();
    if (!q) {
      if (issues.length === 1) {
        selectIssue(issues[0]);
        return;
      }
      return;
    }

    const exact = filteredIssues.find(
      (issue) =>
        issue.copy?.barcode?.toLowerCase() === q || issue.copy?.accession_no?.toLowerCase() === q
    );
    if (exact) {
      selectIssue(exact);
      return;
    }
    if (filteredIssues.length === 1) {
      selectIssue(filteredIssues[0]);
    }
  };

  const reset = () => {
    setSearchInput('');
    setSelected(null);
    setReturnDate(new Date().toISOString().slice(0, 10));
    setFine(0);
    setRemarks('');
    setSuccessMessage('');
  };

  const submit = async () => {
    if (!selected) {
      await alert(`Search by ${borrowerLabel} or book name, then select a row`, { title: 'Select a book' });
      return;
    }
    const ok = await confirm(`Return “${selected.book?.title || 'this book'}” for ${selected.borrower_name || borrowerLabel}?`);
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch('/api/library/circulation/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_id: selected.id,
          returned_at: returnDate,
          fine,
          remarks: remarks.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const returnedId = selected.id;
        setIssues((prev) => prev.filter((issue) => issue.id !== returnedId));
        setSuccessMessage('Book returned successfully.');
        setSelected(null);
        setFine(0);
        setRemarks('');
        setSearchInput('');
        await load();
      } else {
        await alert(data.error || 'Failed to return book', { title: 'Error', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
      <div className="space-y-6">
        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
            {successMessage}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Search by {borrowerLabel} or book
          </label>
          <div className="relative flex gap-3">
            <div className="relative flex-1">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSuccessMessage('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={
                  borrowerType === 'staff'
                    ? 'Staff name, book title, accession no, or barcode'
                    : 'Student name, book title, admission no, accession, or barcode'
                }
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-9 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <FiX size={16} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Search
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {listLoading
              ? 'Loading issued books…'
              : `${filteredIssues.length} of ${issues.length} issued ${borrowerLabel} book(s)`}
          </p>
        </div>

        {listLoading ? (
          <IssuedListSkeleton />
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="max-h-72 overflow-y-auto scroll-smooth">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">{borrowerType === 'staff' ? 'Staff' : 'Student'}</th>
                    <th className="px-3 py-2">Book</th>
                    <th className="px-3 py-2">Accession</th>
                    <th className="px-3 py-2">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                        {issues.length === 0
                          ? `No ${borrowerLabel} books are currently issued`
                          : 'No matches. Try a student name or book title.'}
                      </td>
                    </tr>
                  ) : (
                    filteredIssues.map((issue) => {
                      const overdue = String(issue.due_at).slice(0, 10) < (returnDate || '');
                      const active = selected?.id === issue.id;
                      return (
                        <tr
                          key={issue.id}
                          onClick={() => selectIssue(issue)}
                          className={`cursor-pointer border-t transition-colors ${
                            active ? 'bg-primary-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-gray-900">
                              {issue.borrower_name || issue.member?.name || '—'}
                            </div>
                            {borrowerType === 'student' && (
                              <div className="text-xs text-gray-500">
                                {[issue.admission_number, issue.class_name].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-gray-900">{issue.book?.title || '—'}</div>
                            <div className="text-xs text-gray-500">{issue.book?.author || ''}</div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs">
                            {issue.copy?.accession_no || issue.copy?.barcode || '—'}
                          </td>
                          <td className={`px-3 py-2.5 ${overdue ? 'font-medium text-red-600' : 'text-gray-600'}`}>
                            {String(issue.due_at).slice(0, 10)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selected && (
          <div className="rounded-lg bg-gray-50 p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Return details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <div className="text-xs text-gray-500">Title</div>
                <div className="font-medium">{selected.book?.title || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ISBN</div>
                <div className="font-medium">{selected.book?.isbn || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{borrowerType === 'staff' ? 'Staff' : 'Student'}</div>
                <div className="font-medium">{selected.borrower_name || selected.member?.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Author</div>
                <div className="font-medium">{selected.book?.author || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Issue Date</div>
                <div className="font-medium">{String(selected.issued_at).slice(0, 10)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Due Date</div>
                <div className="font-medium">{String(selected.due_at).slice(0, 10)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Return Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => {
                setReturnDate(e.target.value);
                if (selected) setFine(computeFine(selected, e.target.value));
              }}
              disabled={!selected}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Fine</label>
            <div className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium">
              ₹ {fine.toFixed(2)}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={!selected}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 disabled:bg-gray-100"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={loading || !selected}
          className="min-w-32 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {loading ? 'Returning...' : 'Return Book'}
        </button>
      </div>
    </div>
  );
}
