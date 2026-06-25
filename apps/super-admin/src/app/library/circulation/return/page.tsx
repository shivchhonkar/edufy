'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useEffect, useState } from 'react';
import { useDialog } from '@/shared/context/DialogContext';
import { FiSearch } from 'react-icons/fi';

export default function ReturnPage() {
  const { alert, confirm } = useDialog();
  const [issues, setIssues] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [returnDate, setReturnDate] = useState('');
  const [fine, setFine] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await fetch('/api/library/issues');
      const d = await res.json();
      if (d.success) {
        setIssues((d.data || []).filter((i: any) => i.status === 'issued'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Set today's date as default return date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setReturnDate(today);
  }, []);

  // Calculate fine based on overdue days
  const calculateFine = (dueDate: string, returnDateInput: string) => {
    const due = new Date(dueDate);
    const returned = new Date(returnDateInput);
    const diffTime = returned.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return diffDays * 10; // ₹10 per day fine
    }
    return 0;
  };

  const handleSearch = () => {
    if (!searchInput.trim()) {
      alert('Please enter Book ID or barcode', { title: 'Validation Error' });
      return;
    }

    const searchLower = searchInput.toLowerCase();
    const found = issues.find(
      (issue) =>
        issue.copy?.barcode?.toLowerCase().includes(searchLower) ||
        issue.book?.id?.toString() === searchInput
    );

    if (found) {
      setSelectedIssue(found);
      // Calculate fine
      const calculatedFine = calculateFine(found.due_at, returnDate);
      setFine(calculatedFine);
    } else {
      alert('Book not found in issued list', { title: 'Not Found' });
      setSelectedIssue(null);
      setFine(0);
    }
  };

  const handleReturnDateChange = (newDate: string) => {
    setReturnDate(newDate);
    if (selectedIssue) {
      const calculatedFine = calculateFine(selectedIssue.due_at, newDate);
      setFine(calculatedFine);
    }
  };

  const handleReset = () => {
    setSearchInput('');
    setSelectedIssue(null);
    const today = new Date().toISOString().split('T')[0];
    setReturnDate(today);
    setFine(0);
    setRemarks('');
  };

  const doReturn = async () => {
    if (!selectedIssue) {
      await alert('Please search and select a book first', { title: 'Validation Error' });
      return;
    }
    if (!returnDate) {
      await alert('Return Date is required', { title: 'Validation Error' });
      return;
    }

    const ok = await confirm('Are you sure you want to return this book?');
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch('/api/library/circulation/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_id: selectedIssue.id,
          returned_at: returnDate,
          fine,
          remarks: remarks.trim() || null,
        }),
      });
      const d = await res.json();
      if (d.success) {
        await alert('Book returned successfully!', { title: 'Success' });
        handleReset();
        await load();
      } else {
        await alert(d.error || 'Failed to return book', { title: 'Error' });
      }
    } catch (err) {
      console.error(err);
      await alert('Failed to return book', { title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Return Book</h1>
          <p className="text-gray-500 text-sm mt-1">Issues/Returns / Return Book</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="space-y-6">
            {/* Search Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scan/Enter Book ID <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter Book ID or scan barcode"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <FiSearch size={18} />
                  Search
                </button>
              </div>
            </div>

            {/* Book Details */}
            {selectedIssue && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Book Details</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Title</div>
                    <div className="text-sm font-medium text-gray-900">{selectedIssue.book?.title || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">ISBN</div>
                    <div className="text-sm font-medium text-gray-900">{selectedIssue.book?.isbn || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Member Name</div>
                    <div className="text-sm font-medium text-gray-900">{selectedIssue.member?.name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Author</div>
                    <div className="text-sm font-medium text-gray-900">{selectedIssue.book?.author || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Issue Date</div>
                    <div className="text-sm font-medium text-gray-900">{selectedIssue.issued_at || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Due Date</div>
                    <div className="text-sm font-medium text-gray-900">{selectedIssue.due_at || '-'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Return Date and Fine */}
            <div className="grid grid-cols-2 gap-6">
              {/* Return Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => handleReturnDateChange(e.target.value)}
                  disabled={!selectedIssue}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              {/* Fine */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fine</label>
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                  <span className="text-sm text-gray-700 font-medium">₹ {fine.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={!selectedIssue}
                placeholder="Enter remarks (optional)"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
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
              onClick={doReturn}
              disabled={loading || !selectedIssue}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 min-w-32"
            >
              {loading ? 'Returning...' : 'Return Book'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
