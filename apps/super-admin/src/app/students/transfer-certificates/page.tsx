'use client';

import AppModal from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TransferCertificate from '@/features/students/components/TransferCertificate';
import type { TransferCertificateGeneration } from '@/shared/types';
import {
  parseOptionsSnapshot,
  parseSchoolSnapshot,
  parseStudentSnapshot,
  snapshotToStudent,
} from '@/features/students/utils/transfer-certificate-record';
import { printTransferCertificatesViaIframe } from '@/features/students/utils/transfer-certificate-print';
import { formatDateTime } from '@/lib/dashboard-time';
import { formatStudentDate } from '@/features/students/utils/student-profile';
import { useDialog } from '@/shared/context/DialogContext';
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiFileText,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiX,
} from 'react-icons/fi';

interface HistoryResponse {
  items: TransferCertificateGeneration[];
  total: number;
  page: number;
  limit: number;
}

export default function TransferCertificatesHistoryPage() {
  const { alert } = useDialog();
  const [items, setItems] = useState<TransferCertificateGeneration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selected, setSelected] = useState<TransferCertificateGeneration | null>(null);
  const limit = 25;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set('search', search);
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);

      const res = await fetch(`/api/students/transfer-certificates?${params}`);
      const json = await res.json();
      if (json.success) {
        const data = json.data as HistoryResponse;
        setItems(data.items);
        setTotal(data.total);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, search, fromDate, toDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    setPage(1);
  }, [search, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleReprint = async (record: TransferCertificateGeneration) => {
    const studentSnapshot = parseStudentSnapshot(record.student_snapshot);
    const school = parseSchoolSnapshot(record.school_snapshot);
    const options = parseOptionsSnapshot(record.options);
    const student = snapshotToStudent(studentSnapshot);

    printTransferCertificatesViaIframe([student], school, { [student.id]: options });
  };

  const openDetail = async (record: TransferCertificateGeneration) => {
    try {
      const res = await fetch(`/api/students/transfer-certificates/${record.id}`);
      const json = await res.json();
      if (json.success) {
        setSelected(json.data as TransferCertificateGeneration);
      } else {
        await alert(json.error || 'Failed to load record', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to load record', { title: 'Error', type: 'error' });
    }
  };

  const studentLabel = (record: TransferCertificateGeneration) => {
    const snapshot = record.student_snapshot as { full_name?: string; admission_number?: string };
    return snapshot.full_name || snapshot.admission_number || `Student #${record.student_id}`;
  };

  const classLabel = (record: TransferCertificateGeneration) => {
    const snapshot = record.student_snapshot as {
      class_name?: string;
      section_name?: string;
    };
    return [snapshot.class_name, snapshot.section_name].filter(Boolean).join(' · ') || '—';
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/students" className="hover:text-primary-600 flex items-center gap-1">
                <FiArrowLeft size={14} />
                Students
              </Link>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiFileText className="text-primary-600" />
              Transfer Certificate History
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review all generated transfer certificates with issuer and timestamp.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchHistory}
              className="border px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <FiRefreshCw size={15} />
              Refresh
            </button>
            <Link
              href="/students/transfer-certificates/generate"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm"
            >
              Generate New TC
            </Link>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search TC number, student name, admission no..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm text-gray-900"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900"
              aria-label="From date"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900"
              aria-label="To date"
            />
          </form>
          {(search || fromDate || toDate) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {search && (
                <span className="bg-gray-100 px-2 py-1 rounded">
                  Search: {search}
                  <button
                    type="button"
                    className="ml-1 text-gray-500 hover:text-gray-800"
                    onClick={() => {
                      setSearch('');
                      setSearchInput('');
                    }}
                  >
                    ×
                  </button>
                </span>
              )}
              {fromDate && (
                <span className="bg-gray-100 px-2 py-1 rounded">
                  From: {fromDate}
                  <button
                    type="button"
                    className="ml-1 text-gray-500 hover:text-gray-800"
                    onClick={() => setFromDate('')}
                  >
                    ×
                  </button>
                </span>
              )}
              {toDate && (
                <span className="bg-gray-100 px-2 py-1 rounded">
                  To: {toDate}
                  <button
                    type="button"
                    className="ml-1 text-gray-500 hover:text-gray-800"
                    onClick={() => setToDate('')}
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Generated</th>
                  <th className="px-4 py-3 font-medium">TC Number</th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Generated By</th>
                  <th className="px-4 py-3 font-medium">Issue / Leaving</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                      Loading history...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                      No transfer certificates generated yet.
                    </td>
                  </tr>
                ) : (
                  items.map((record) => {
                    const options = parseOptionsSnapshot(record.options);
                    const snapshot = record.student_snapshot as { admission_number?: string };
                    return (
                      <tr key={record.id} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {formatDateTime(record.generated_at)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-primary-800">
                          {record.tc_number}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{studentLabel(record)}</p>
                          <p className="text-xs text-gray-500">{snapshot.admission_number}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{classLabel(record)}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {record.generated_by_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          <span className="block text-xs">
                            Issue: {formatStudentDate(options.issueDate)}
                          </span>
                          <span className="block text-xs text-gray-500">
                            Left: {formatStudentDate(options.dateOfLeaving)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openDetail(record)}
                              className="p-2 rounded hover:bg-gray-100 text-gray-600"
                              title="View details"
                            >
                              <FiEye size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReprint(record)}
                              className="p-2 rounded hover:bg-gray-100 text-gray-600"
                              title="Reprint"
                            >
                              <FiPrinter size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <p className="text-gray-500">
                {total} record{total !== 1 ? 's' : ''} · Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded border disabled:opacity-40 hover:bg-gray-50"
                >
                  <FiChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 rounded border disabled:opacity-40 hover:bg-gray-50"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <AppModal open={!!selected} onClose={() => setSelected(null)}>
          <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-xl overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Transfer Certificate Record</h2>
                <p className="text-sm text-gray-500 font-mono">{selected.tc_number}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReprint(selected)}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
                >
                  <FiPrinter size={16} />
                  Reprint
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Generated at</p>
                  <p className="font-medium text-gray-900">{formatDateTime(selected.generated_at)}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Generated by</p>
                  <p className="font-medium text-gray-900">{selected.generated_by_name || '—'}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Academic year</p>
                  <p className="font-medium text-gray-900">{selected.academic_year || '—'}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Reason for leaving</p>
                  <p className="font-medium text-gray-900">
                    {parseOptionsSnapshot(selected.options).reasonForLeaving || '—'}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded border bg-white">
                <TransferCertificate
                  student={snapshotToStudent(parseStudentSnapshot(selected.student_snapshot))}
                  school={parseSchoolSnapshot(selected.school_snapshot)}
                  options={parseOptionsSnapshot(selected.options)}
                />
              </div>
            </div>
          </div>
        </AppModal>
      )}
    </DashboardLayout>
  );
}
