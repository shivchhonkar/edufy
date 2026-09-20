'use client';

import { useEffect, useState } from 'react';
import { useDialog } from '@/shared/context/DialogContext';
import StudentPickSelect from '@/features/students/components/StudentPickSelect';
import StaffPickSelect from './StaffPickSelect';

interface Book {
  id: number;
  title: string;
  author?: string | null;
  isbn?: string | null;
  copies?: { id: number; barcode: string; status: string }[];
}

interface FineRule {
  borrower_type: string;
  days_allowed: number;
}

interface LibraryIssueFormProps {
  borrowerType: 'student' | 'staff';
  onIssued?: () => void;
}

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function LibraryIssueForm({ borrowerType, onIssued }: LibraryIssueFormProps) {
  const { alert } = useDialog();
  const [books, setBooks] = useState<Book[]>([]);
  const [rules, setRules] = useState<FineRule[]>([]);
  const [borrowerId, setBorrowerId] = useState('');
  const [bookId, setBookId] = useState('');
  const [copyId, setCopyId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const daysAllowed =
    rules.find((r) => r.borrower_type === borrowerType)?.days_allowed ??
    rules.find((r) => r.borrower_type === 'all')?.days_allowed ??
    14;

  const load = async () => {
    const [bRes, rRes] = await Promise.all([fetch('/api/library/books'), fetch('/api/library/fine-rules')]);
    const [bData, rData] = await Promise.all([bRes.json(), rRes.json()]);
    if (bData.success) setBooks(bData.data || []);
    if (rData.success) setRules(rData.data || []);
  };

  useEffect(() => {
    load();
    const today = new Date().toISOString().slice(0, 10);
    setIssueDate(today);
  }, []);

  useEffect(() => {
    if (issueDate) setDueDate(addDays(issueDate, daysAllowed));
  }, [issueDate, daysAllowed]);

  const selectedBook = books.find((b) => String(b.id) === bookId);
  const availableCopies = (selectedBook?.copies || []).filter((c) => c.status === 'available');

  const reset = () => {
    setBorrowerId('');
    setBookId('');
    setCopyId('');
    const today = new Date().toISOString().slice(0, 10);
    setIssueDate(today);
    setDueDate(addDays(today, daysAllowed));
  };

  const submit = async () => {
    if (!borrowerId) {
      await alert(borrowerType === 'staff' ? 'Staff is required' : 'Student is required', { title: 'Validation Error' });
      return;
    }
    if (!bookId) {
      await alert('Book is required', { title: 'Validation Error' });
      return;
    }
    if (!copyId) {
      await alert('Please select an available copy', { title: 'Validation Error' });
      return;
    }
    if (!issueDate || !dueDate) {
      await alert('Issue and due dates are required', { title: 'Validation Error' });
      return;
    }
    if (new Date(dueDate) <= new Date(issueDate)) {
      await alert('Due date must be after issue date', { title: 'Validation Error' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/library/circulation/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrower_type: borrowerType,
          student_id: borrowerType === 'student' ? borrowerId : null,
          staff_id: borrowerType === 'staff' ? borrowerId : null,
          book_id: Number(bookId),
          copy_id: Number(copyId),
          issued_at: issueDate,
          due_at: dueDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (onIssued) {
          onIssued();
          return;
        }
        await alert('Book issued successfully', { title: 'Success', type: 'success' });
        reset();
        await load();
      } else {
        await alert(data.error || 'Failed to issue book', { title: 'Error', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {borrowerType === 'staff' ? 'Staff' : 'Student'} <span className="text-red-500">*</span>
            </label>
            {borrowerType === 'staff' ? (
              <StaffPickSelect value={borrowerId} onChange={setBorrowerId} />
            ) : (
              <StudentPickSelect value={borrowerId} onChange={setBorrowerId} />
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Book <span className="text-red-500">*</span>
            </label>
            <select
              value={bookId}
              onChange={(e) => {
                setBookId(e.target.value);
                setCopyId('');
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
            >
              <option value="">Select book</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedBook && (
          <div className="rounded-lg bg-gray-50 p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Book Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500">Title</div>
                <div className="font-medium">{selectedBook.title}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Author</div>
                <div className="font-medium">{selectedBook.author || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ISBN</div>
                <div className="font-medium">{selectedBook.isbn || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Available copies</div>
                <div className="font-medium">{availableCopies.length}</div>
              </div>
            </div>
            {availableCopies.length > 0 && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Select copy <span className="text-red-500">*</span>
                </label>
                <select
                  value={copyId}
                  onChange={(e) => setCopyId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
                >
                  <option value="">Select an available copy</option>
                  {availableCopies.map((copy) => (
                    <option key={copy.id} value={copy.id}>
                      {copy.barcode}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Issue Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">Default loan period: {daysAllowed} days (Fine Master)</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button type="button" onClick={reset} className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Reset
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="min-w-32 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {loading ? 'Issuing...' : 'Issue Book'}
        </button>
      </div>
    </div>
  );
}
