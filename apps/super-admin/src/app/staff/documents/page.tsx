'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';
import ViewStaffModal from '@/features/staff/components/ViewStaffModal';
import VirtualizedStaffDocumentsTable from '@/features/staff/components/VirtualizedStaffDocumentsTable';
import type { StaffListItem } from '@/features/staff/components/VirtualizedStaffTable';
import { printHtmlDocument } from '@/features/students/utils/print-html';
import { useDialog } from '@/shared/context/DialogContext';
import { useSettings } from '@/shared/SettingsContext';
import {
  documentStatusLabel,
  getDocumentStatusStyle,
  STAFF_DOCUMENT_COLUMNS,
  STAFF_DOCUMENT_COLUMN_LABELS,
  type StaffDocumentReportRow,
} from '@/lib/staff-document-report';
import { Staff } from '@/shared/types';
import { FiPrinter, FiSearch } from 'react-icons/fi';

const STAFF_FETCH_LIMIT = 5000;

const quietButtonClass =
  'inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40';
const primaryButtonClass =
  'inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs text-white hover:bg-primary-700 disabled:opacity-40';
const fieldClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';

function StatusCell({ status }: { status: StaffDocumentReportRow['photo'] }) {
  const style = getDocumentStatusStyle(status);
  return (
    <span className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium" style={style}>
      {documentStatusLabel(status)}
    </span>
  );
}

export default function StaffDocumentsPage() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const [tab, setTab] = useState<'files' | 'report'>('files');
  const [staff, setStaff] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
  const [reportRows, setReportRows] = useState<StaffDocumentReportRow[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [reportLoading, setReportLoading] = useState(false);
  const [departmentId, setDepartmentId] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        limit: String(STAFF_FETCH_LIMIT),
        page: '1',
        status: 'active',
      });
      const res = await fetch(`/api/staff?${params}`);
      const data = await res.json();
      if (data.success) setStaff(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    fetch('/api/departments?active_only=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDepartments(d.data || []);
      })
      .catch(console.error);
  }, []);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (departmentId) params.set('department_id', departmentId);
      if (missingOnly) params.set('missing_only', 'true');
      const response = await fetch(`/api/staff/document-report?${params}`);
      const data = await response.json();
      if (data.success) {
        setReportRows(data.data.items || []);
        setMissingCount(data.data.missing_count || 0);
      } else {
        await alert(data.error || 'Failed to load report', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to load staff document report', { title: 'Error', type: 'error' });
    } finally {
      setReportLoading(false);
    }
  }, [alert, departmentId, missingOnly]);

  useEffect(() => {
    if (tab === 'report') void fetchReport();
  }, [tab, fetchReport]);

  const printReport = async () => {
    if (reportRows.length === 0) {
      await alert('No staff to print for the selected filters.', { title: 'Nothing to print', type: 'warning' });
      return;
    }
    const head = STAFF_DOCUMENT_COLUMNS.map((column) => `<th>${STAFF_DOCUMENT_COLUMN_LABELS[column]}</th>`).join('');
    const body = reportRows
      .map(
        (row, index) => `<tr>
          <td>${index + 1}</td>
          <td>${row.employee_id}</td>
          <td>${row.staff_name}</td>
          <td>${row.department_name}</td>
          <td>${row.designation}</td>
          ${STAFF_DOCUMENT_COLUMNS.map((column) => `<td>${documentStatusLabel(row[column])}</td>`).join('')}
        </tr>`,
      )
      .join('');
    printHtmlDocument(
      'Staff document report',
      `<h1>${settings.school_name || 'School'}</h1><p>Staff document completeness</p>
       <table><thead><tr><th>Sr</th><th>Employee ID</th><th>Name</th><th>Department</th><th>Designation</th>${head}</tr></thead><tbody>${body}</tbody></table>`,
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Staff Documents</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              {tab === 'files'
                ? 'Upload and manage documents for each staff member.'
                : 'See which staff documents are submitted or still missing.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={moduleTabBarClass}>
              <button type="button" onClick={() => setTab('files')} className={moduleTabClass(tab === 'files')}>
                Documents
              </button>
              <button type="button" onClick={() => setTab('report')} className={moduleTabClass(tab === 'report')}>
                Document report
              </button>
            </div>
            {tab === 'report' && (
              <button type="button" onClick={printReport} disabled={reportLoading || reportRows.length === 0} className={primaryButtonClass}>
                <FiPrinter size={14} />
                Print report
              </button>
            )}
          </div>
        </div>

        {tab === 'files' ? (
          <>
            <div className="relative max-w-md">
              <FiSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="search"
                placeholder="Name or employee ID"
                className={`${fieldClass} pl-8`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {loading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-10 animate-pulse rounded bg-gray-100" />
                  ))}
                </div>
              ) : (
                <VirtualizedStaffDocumentsTable staff={staff} onManageDocuments={setViewingStaff} />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={`${fieldClass} sm:w-52`}
                aria-label="Department"
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={missingOnly}
                  onChange={(e) => setMissingOnly(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600"
                />
                Missing documents only
              </label>
              <span className={quietButtonClass}>
                {reportLoading ? 'Loading…' : `${reportRows.length} listed · ${missingCount} missing`}
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2.5">Employee</th>
                      <th className="px-4 py-2.5">Department</th>
                      <th className="px-4 py-2.5">Designation</th>
                      {STAFF_DOCUMENT_COLUMNS.map((column) => (
                        <th key={column} className="px-3 py-2.5 text-center">{STAFF_DOCUMENT_COLUMN_LABELS[column]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportLoading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-xs text-gray-500">Loading report…</td>
                      </tr>
                    ) : reportRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center">
                          <p className="text-sm font-medium text-gray-700">No staff match this report</p>
                          <p className="mt-1 text-xs text-gray-500">Try another department or turn off the missing-documents filter.</p>
                        </td>
                      </tr>
                    ) : (
                      reportRows.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-gray-900">{row.staff_name}</p>
                            <p className="text-xs text-gray-500">{row.employee_id}</p>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{row.department_name}</td>
                          <td className="px-4 py-2.5 text-gray-600">{row.designation}</td>
                          {STAFF_DOCUMENT_COLUMNS.map((column) => (
                            <td key={column} className="px-3 py-2.5 text-center">
                              <StatusCell status={row[column]} />
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <ViewStaffModal
        isOpen={!!viewingStaff}
        onClose={() => setViewingStaff(null)}
        staff={viewingStaff}
        initialTab="documents"
      />
    </DashboardLayout>
  );
}
