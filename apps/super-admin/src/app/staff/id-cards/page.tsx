'use client';

import AppModal, { APP_MODAL_PANEL } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import VirtualizedStaffSelectTable from '@/features/staff/components/VirtualizedStaffSelectTable';
import type { StaffListItem } from '@/features/staff/components/VirtualizedStaffTable';
import StaffIdCard from '@/features/staff/components/StaffIdCard';
import { resolveAssetUrl, resolveDocumentWatermarkUrl, resolveSchoolLogoUrl } from '@/features/students/utils/school-document-utils';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import { FiArrowLeft, FiCreditCard, FiPrinter, FiSearch, FiX } from 'react-icons/fi';

const STAFF_FETCH_LIMIT = 5000;

export default function StaffIdCardsPage() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const [staff, setStaff] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
      <div className="mx-auto max-w-7xl space-y-4 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/staff"
              className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <FiArrowLeft size={14} /> Back to Staff
            </Link>
            <h1 className="flex items-center gap-2 text-xl text-gray-900">
              <FiCreditCard className="text-primary-600" />
              Staff ID Cards
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Select staff members and print identity cards.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              disabled={selectedStaff.length === 0}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              Preview {selectedStaff.length > 0 ? `(${selectedStaff.length})` : ''}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={selectedStaff.length === 0}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-40"
            >
              <FiPrinter size={16} />
              Print {selectedStaff.length > 0 ? `(${selectedStaff.length})` : ''}
            </button>
          </div>
        </div>

        <div className="relative max-w-md">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or employee ID..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
            </div>
          ) : (
            <VirtualizedStaffSelectTable
              staff={staff}
              selectedIds={selectedIds}
              onToggle={toggleStaff}
              onToggleAll={toggleAll}
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
