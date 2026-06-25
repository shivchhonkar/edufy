'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useEffect, useState } from 'react';
import { useDialog } from '@/shared/context/DialogContext';

export default function IssuePage() {
  const { alert } = useDialog();
  const [books, setBooks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedCopyId, setSelectedCopyId] = useState<number | null>(null);
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const [bRes, mRes] = await Promise.all([
        fetch('/api/library/books'),
        fetch('/api/library/members'),
      ]);
      const [bData, mData] = await Promise.all([bRes.json(), mRes.json()]);
      if (bData.success) setBooks(bData.data || []);
      if (mData.success) setMembers(mData.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Set today's date as default
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setIssueDate(today);
  }, []);

  // Get selected book details
  const selectedBook = books.find((b) => b.id === selectedBookId);
  const availableCopies = selectedBook
    ? (selectedBook.copies || []).filter((c: any) => c.status === 'available')
    : [];

  // Reset form
  const handleReset = () => {
    setSelectedMemberId(null);
    setSelectedBookId(null);
    setSelectedCopyId(null);
    const today = new Date().toISOString().split('T')[0];
    setIssueDate(today);
    setDueDate('');
  };

  // Issue book
  const doIssue = async () => {
    if (!selectedMemberId) {
      await alert('Member is required', { title: 'Validation Error' });
      return;
    }
    if (!selectedBookId) {
      await alert('Book is required', { title: 'Validation Error' });
      return;
    }
    if (!selectedCopyId) {
      await alert('Please select an available copy', { title: 'Validation Error' });
      return;
    }
    if (!issueDate) {
      await alert('Issue Date is required', { title: 'Validation Error' });
      return;
    }
    if (!dueDate) {
      await alert('Due Date is required', { title: 'Validation Error' });
      return;
    }

    // Validate due date is after issue date
    if (new Date(dueDate) <= new Date(issueDate)) {
      await alert('Due Date must be after Issue Date', { title: 'Validation Error' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/library/circulation/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copy_id: selectedCopyId,
          member_id: selectedMemberId,
          issued_at: issueDate,
          due_at: dueDate,
        }),
      });
      const d = await res.json();
      if (d.success) {
        await alert('Book issued successfully!', { title: 'Success' });
        handleReset();
        await load();
      } else {
        await alert(d.error || 'Failed to issue book', { title: 'Error' });
      }
    } catch (err) {
      console.error(err);
      await alert('Failed to issue book', { title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issue Book</h1>
          <p className="text-gray-500 text-sm mt-1">Issues/Returns / Issue Book</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="space-y-6">
            {/* Member and Book Selection */}
            <div className="grid grid-cols-2 gap-6">
              {/* Member */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMemberId ?? ''}
                  onChange={(e) => setSelectedMemberId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.card_number}
                    </option>
                  ))}
                </select>
              </div>

              {/* Book */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Book <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedBookId ?? ''}
                  onChange={(e) => {
                    const bookId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedBookId(bookId);
                    setSelectedCopyId(null); // Reset copy selection
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select book</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Book Details */}
            {selectedBook && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Book Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Title</div>
                    <div className="text-sm font-medium text-gray-900">{selectedBook.title || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Author</div>
                    <div className="text-sm font-medium text-gray-900">{selectedBook.author || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">ISBN</div>
                    <div className="text-sm font-medium text-gray-900">{selectedBook.isbn || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Available Copies</div>
                    <div className="text-sm font-medium text-gray-900">{availableCopies.length}</div>
                  </div>
                </div>

                {/* Copy Selection */}
                {availableCopies.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Copy <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedCopyId ?? ''}
                      onChange={(e) => setSelectedCopyId(e.target.value ? parseInt(e.target.value, 10) : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select an available copy</option>
                      {availableCopies.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.barcode}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Issue and Due Dates */}
            <div className="grid grid-cols-2 gap-6">
              {/* Issue Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end mt-8">
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              onClick={doIssue}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 min-w-32"
            >
              {loading ? 'Issuing...' : 'Issue Book'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
