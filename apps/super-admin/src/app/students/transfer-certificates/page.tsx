'use client';

import AppModal, { AppModalShell } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TransferCertificate from '@/features/students/components/TransferCertificate';
import type { TransferCertificateGeneration } from '@/shared/types';
import {
  buildTransferCertificateSchoolInfo,
  parseOptionsSnapshot,
  parseStudentSnapshot,
  snapshotToStudent,
} from '@/features/students/utils/transfer-certificate-record';
import { printTransferCertificatesViaIframe } from '@/features/students/utils/transfer-certificate-print';
import { formatDateTime } from '@/lib/dashboard-time';
import { formatStudentDate } from '@/features/students/utils/student-profile';
import { useDialog } from '@/shared/context/DialogContext';
import { useSettings } from '@/shared/SettingsContext';
import {
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiX,
} from 'react-icons/fi';

const primaryButtonClass =
  'inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs text-white hover:bg-primary-700';
const quietButtonClass =
  'inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50';
const fieldClass =
  'w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';
const tableHeadClass =
  'border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500';

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200/90 ${className}`} />;
}

interface HistoryResponse {
  items: TransferCertificateGeneration[];
  total: number;
  page: number;
  limit: number;
}

export default function TransferCertificatesHistoryPage() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const [reportSettings, setReportSettings] = useState<{
    counsellor_name?: string;
    counsellor_signature_url?: string;
    logo_url?: string;
  }>({});
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

  useEffect(() => {
    fetch('/api/settings/reports')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setReportSettings(d.data);
      })
      .catch(console.error);
  }, []);

  const currentSchoolInfo = useMemo(
    () => buildTransferCertificateSchoolInfo(settings, reportSettings),
    [settings, reportSettings],
  );

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
    const options = parseOptionsSnapshot(record.options);
    const student = snapshotToStudent(studentSnapshot);

    printTransferCertificatesViaIframe([student], currentSchoolInfo, { [student.id]: options });
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

  const filtersActive = Boolean(search || fromDate || toDate);

  return (
    <DashboardLayout>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Transfer Certificates</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Review generated certificates, then reprint or open a record.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={fetchHistory} className={quietButtonClass}>
              <FiRefreshCw size={14} />
              Refresh
            </button>
            <Link href="/students/transfer-certificates/generate" className={primaryButtonClass}>
              <FiPlus size={14} />
              Generate TC
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Register</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {loading ? 'Loading…' : `${total} ${total === 1 ? 'certificate' : 'certificates'}`}
              </p>
            </div>
            <form onSubmit={handleSearch} className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-[minmax(16rem,22rem)_9rem_9rem_auto]">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <FiSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="search"
                  placeholder="TC number, name, or admission no."
                  className={`${fieldClass} pl-8`}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={fieldClass}
                aria-label="From date"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={fieldClass}
                aria-label="To date"
              />
              <button type="submit" className={`${quietButtonClass} justify-center`}>
                Search
              </button>
            </form>
          </div>
          {filtersActive && (
            <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-4 py-2">
              {search && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600"
                  onClick={() => {
                    setSearch('');
                    setSearchInput('');
                  }}
                >
                  {search}
                  <FiX size={12} />
                </button>
              )}
              {fromDate && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600"
                  onClick={() => setFromDate('')}
                >
                  From {fromDate}
                  <FiX size={12} />
                </button>
              )}
              {toDate && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600"
                  onClick={() => setToDate('')}
                >
                  To {toDate}
                  <FiX size={12} />
                </button>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className={tableHeadClass}>
                  <th className="px-4 py-2.5 font-semibold">Generated</th>
                  <th className="px-4 py-2.5 font-semibold">TC number</th>
                  <th className="px-4 py-2.5 font-semibold">Student</th>
                  <th className="px-4 py-2.5 font-semibold">Class</th>
                  <th className="px-4 py-2.5 font-semibold">Generated by</th>
                  <th className="px-4 py-2.5 font-semibold">Issue / leaving</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-t border-gray-100">
                      <td className="px-4 py-2.5"><Pulse className="h-3.5 w-28" /></td>
                      <td className="px-4 py-2.5"><Pulse className="h-3.5 w-24" /></td>
                      <td className="px-4 py-2.5">
                        <Pulse className="h-3.5 w-32" />
                        <Pulse className="mt-1.5 h-3 w-16" />
                      </td>
                      <td className="px-4 py-2.5"><Pulse className="h-3.5 w-20" /></td>
                      <td className="px-4 py-2.5"><Pulse className="h-3.5 w-24" /></td>
                      <td className="px-4 py-2.5">
                        <Pulse className="h-3 w-24" />
                        <Pulse className="mt-1.5 h-3 w-20" />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Pulse className="h-6 w-6" />
                          <Pulse className="h-6 w-6" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <p className="text-sm font-medium text-gray-700">No transfer certificates yet</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {filtersActive ? 'Try a different search or date range.' : 'Generate a certificate to see it here.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  items.map((record) => {
                    const options = parseOptionsSnapshot(record.options);
                    const snapshot = record.student_snapshot as { admission_number?: string };
                    return (
                      <tr key={record.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                        <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">
                          {formatDateTime(record.generated_at)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{record.tc_number}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900">{studentLabel(record)}</p>
                          <p className="text-xs text-gray-500">{snapshot.admission_number}</p>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{classLabel(record)}</td>
                        <td className="px-4 py-2.5 text-gray-600">{record.generated_by_name || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">
                          <span className="block text-xs">Issue {formatStudentDate(options.issueDate)}</span>
                          <span className="block text-xs text-gray-500">Left {formatStudentDate(options.dateOfLeaving)}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => openDetail(record)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-primary-600"
                              aria-label="View details"
                            >
                              <FiEye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReprint(record)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-primary-600"
                              aria-label="Reprint"
                            >
                              <FiPrinter size={15} />
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

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-4 py-2.5">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Previous page"
              >
                <FiChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Next page"
              >
                <FiChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AppModal open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <AppModalShell
            header={
              <>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Transfer certificate</h2>
                  <p className="mt-0.5 font-mono text-xs text-gray-500">{selected.tc_number}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                  aria-label="Close"
                >
                  <FiX size={18} />
                </button>
              </>
            }
            footer={
              <>
                <button type="button" onClick={() => setSelected(null)} className={quietButtonClass}>
                  Close
                </button>
                <button type="button" onClick={() => handleReprint(selected)} className={primaryButtonClass}>
                  <FiPrinter size={14} />
                  Reprint
                </button>
              </>
            }
          >
            <div className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Generated at</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-900">{formatDateTime(selected.generated_at)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Generated by</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-900">{selected.generated_by_name || '—'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Academic year</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-900">{selected.academic_year || '—'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Reason for leaving</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-900">
                    {parseOptionsSnapshot(selected.options).reasonForLeaving || '—'}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <TransferCertificate
                  student={snapshotToStudent(parseStudentSnapshot(selected.student_snapshot))}
                  school={currentSchoolInfo}
                  options={parseOptionsSnapshot(selected.options)}
                />
              </div>
            </div>
          </AppModalShell>
        )}
      </AppModal>
    </DashboardLayout>
  );
}
