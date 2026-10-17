'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import VirtualizedStaffSelectTable from '@/features/staff/components/VirtualizedStaffSelectTable';
import type { StaffListItem } from '@/features/staff/components/VirtualizedStaffTable';
import StaffIdCard from '@/features/staff/components/StaffIdCard';
import { resolveAssetUrl, resolveDocumentWatermarkUrl, resolveSchoolLogoUrl } from '@/features/students/utils/school-document-utils';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import { FiPrinter, FiSearch, FiX } from 'react-icons/fi';

const primaryButtonClass =
  'inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs text-white hover:bg-primary-700 disabled:opacity-40';
const quietButtonClass =
  'inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40';
const fieldClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';

const STAFF_FETCH_LIMIT = 5000;

interface DepartmentOption {
  id: number;
  name: string;
}

export default function StaffIdCardsPage() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const [staff, setStaff] = useState<StaffListItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [reportSettings, setReportSettings] = useState<{
    logo_url?: string;
    counsellor_name?: string;
    counsellor_signature_url?: string;
    website?: string;
    show_watermark?: boolean;
    watermark_url?: string;
  }>({});

  useEffect(() => {
    fetch('/api/settings/reports')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setReportSettings(d.data);
      })
      .catch(console.error);

    fetch('/api/departments?active_only=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDepartments(d.data);
      })
      .catch(console.error);
  }, []);

  const schoolInfo = useMemo(
    () => ({
      name: settings.school_name || 'School',
      logoUrl: resolveSchoolLogoUrl(settings, reportSettings),
      phone: settings.school_phone || undefined,
      address: settings.school_address || undefined,
      website: reportSettings.website || undefined,
      academicYear: settings.academic_year ? `Academic Year ${settings.academic_year}` : undefined,
      principalName: reportSettings.counsellor_name || undefined,
      signatureUrl: resolveAssetUrl(reportSettings.counsellor_signature_url),
      showWatermark: reportSettings.show_watermark !== false,
      stampUrl: resolveDocumentWatermarkUrl(reportSettings),
    }),
    [settings, reportSettings],
  );

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

  const filteredStaff = useMemo(() => {
    if (!departmentId) return staff;
    const selectedDepartment = departments.find((d) => String(d.id) === departmentId);
    if (!selectedDepartment) return staff;

    return staff.filter((member) => {
      const row = member as StaffListItem & { department_id?: number | null };
      if (row.department_id != null) {
        return String(row.department_id) === departmentId;
      }
      const label = member.department_name || member.department || '';
      return label === selectedDepartment.name;
    });
  }, [staff, departmentId, departments]);

  const selectedStaff = useMemo(
    () => staff.filter((s) => selectedIds.has(s.id)),
    [staff, selectedIds],
  );

  const toggleStaff = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (ids: number[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const handlePrint = () => {
    if (selectedStaff.length === 0) {
      alert('Select at least one staff member', { title: 'No selection', type: 'warning' });
      return;
    }
    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 200);
    });
  };

  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100dvh-7rem)] flex-col gap-3 print:hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Employee ID Cards</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Select staff, then preview or print their identity cards.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              disabled={selectedStaff.length === 0}
              className={quietButtonClass}
            >
              Preview{selectedStaff.length > 0 ? ` (${selectedStaff.length})` : ''}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={selectedStaff.length === 0}
              className={primaryButtonClass}
            >
              <FiPrinter size={14} />
              Print{selectedStaff.length > 0 ? ` (${selectedStaff.length})` : ''}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Staff</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {loading
                  ? 'Loading…'
                  : `${filteredStaff.length} ${filteredStaff.length === 1 ? 'member' : 'members'}`}
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(14rem,18rem)_11rem_auto] lg:w-auto">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="search"
                  placeholder="Name or employee ID"
                  className={`${fieldClass} pl-8`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={fieldClass}
                aria-label="Department"
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              {search || departmentId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setDepartmentId('');
                  }}
                  className={`${quietButtonClass} justify-center`}
                >
                  <FiX size={12} />
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          {loading ? (
            <div className="flex-1 space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium text-gray-700">No staff found</p>
              <p className="mt-1 text-xs text-gray-500">Try another name, employee ID, or department.</p>
            </div>
          ) : (
            <VirtualizedStaffSelectTable
              staff={filteredStaff}
              selectedIds={selectedIds}
              onToggle={toggleStaff}
              onToggleAll={toggleAll}
              scrollClassName="h-[calc(100dvh-16rem)] min-h-[360px]"
            />
          )}
        </div>
      </div>

      {showPreviewModal && selectedStaff.length > 0 && (
        <AppModal open={showPreviewModal} onClose={() => setShowPreviewModal(false)}>
          <div className={APP_MODAL_PANEL}>
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 print:hidden">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Staff ID Card Preview</h2>
                <p className="text-sm text-gray-500">{selectedStaff.length} selected</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
                >
                  <FiPrinter size={16} />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 print:overflow-visible print:p-0">
              <div
                id="staff-id-cards-print-root"
                className="staff-id-cards-grid flex flex-wrap justify-center gap-4"
              >
                {selectedStaff.map((member) => (
                  <StaffIdCard key={member.id} staff={member} school={schoolInfo} />
                ))}
              </div>
            </div>
          </div>
        </AppModal>
      )}

      <div id="staff-id-cards-print-root" className="hidden print:block">
        {selectedStaff.map((member) => (
          <StaffIdCard key={member.id} staff={member} school={schoolInfo} />
        ))}
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #staff-id-cards-print-root,
          #staff-id-cards-print-root * {
            visibility: visible;
          }
          #staff-id-cards-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .staff-id-card-sheet {
            page-break-inside: avoid;
          }
          .staff-id-card {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
