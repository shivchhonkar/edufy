'use client';

import AppModal from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import VirtualizedStudentSelectTable from '@/features/students/components/VirtualizedStudentSelectTable';
import { usePreselectStudentIdsFromUrl } from '@/features/students/hooks/usePreselectStudentFromUrl';
import StudentIdCard, {
  type StudentIdCardSchoolInfo,
} from '@/features/students/components/StudentIdCard';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import type { Student } from '@/shared/types';
import {
  FiArrowLeft,
  FiChevronDown,
  FiChevronUp,
  FiCreditCard,
  FiFilter,
  FiInfo,
  FiPrinter,
  FiSearch,
  FiX,
} from 'react-icons/fi';

const STUDENTS_FETCH_LIMIT = 50000;
const UNASSIGNED_CLASS_FILTER = 'unassigned';

interface Class {
  id: number;
  name: string;
}

interface Section {
  id: number;
  class_id: number;
  name: string;
}

export default function StudentIdCardsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        </DashboardLayout>
      }
    >
      <StudentIdCardsPageContent />
    </Suspense>
  );
}

function StudentIdCardsPageContent() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [reportSettings, setReportSettings] = useState<{
    counsellor_name?: string;
    counsellor_signature_url?: string;
  }>({});

  useEffect(() => {
    fetch('/api/settings/reports')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setReportSettings(d.data);
      })
      .catch(console.error);
  }, []);

  const schoolInfo: StudentIdCardSchoolInfo = useMemo(
    () => ({
      name: settings.school_name || 'School',
      logoUrl: settings.logo_url || undefined,
      phone: settings.school_phone || undefined,
      address: settings.school_address || undefined,
      academicYear: settings.academic_year
        ? `Academic Year ${settings.academic_year}`
        : undefined,
      principalName: reportSettings.counsellor_name || undefined,
      signatureUrl: reportSettings.counsellor_signature_url || undefined,
    }),
    [settings, reportSettings]
  );

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((d) => d.success && setClasses(d.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (classFilter && classFilter !== UNASSIGNED_CLASS_FILTER) {
      fetch(`/api/sections?class_id=${classFilter}`)
        .then((r) => r.json())
        .then((d) => d.success && setSections(d.data))
        .catch(console.error);
    } else {
      setSections([]);
      setSectionFilter('');
    }
  }, [classFilter]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        limit: String(STUDENTS_FETCH_LIMIT),
        page: '1',
      });
      if (classFilter) params.set('class_id', classFilter);
      if (sectionFilter && classFilter !== UNASSIGNED_CLASS_FILTER) {
        params.set('section_id', sectionFilter);
      }

      const response = await fetch(`/api/students?${params}`);
      const data = await response.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search, classFilter, sectionFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedIds.has(s.id)),
    [students, selectedIds]
  );

  usePreselectStudentIdsFromUrl(students, setSelectedIds);

  const toggleStudent = (id: number) => {
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

  const handlePreview = async () => {
    if (selectedStudents.length === 0) {
      await alert('Select at least one student to preview ID cards.', {
        title: 'No selection',
        type: 'warning',
      });
      return;
    }
    setShowPreviewModal(true);
  };

  const handlePrint = async () => {
    if (selectedStudents.length === 0) {
      await alert('Select at least one student to print ID cards.', {
        title: 'No selection',
        type: 'warning',
      });
      return;
    }
    setShowPreviewModal(true);
    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 200);
    });
  };

  const hasActiveFilters = Boolean(search || classFilter || sectionFilter);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
          <div>
            <Link
              href="/students"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-1"
            >
              <FiArrowLeft size={14} /> Students
            </Link>
            <h1 className="text-xl text-gray-900 flex items-center gap-2">
              <FiCreditCard className="text-primary-600" />
              Student ID Cards
              <span className="relative group/tip">
                <button
                  type="button"
                  aria-label="ID card printing tips"
                  className="text-gray-400 hover:text-primary-600 transition-colors rounded-full p-0.5"
                >
                  <FiInfo size={18} />
                </button>
                <span
                  role="tooltip"
                  className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-normal text-gray-700 shadow-lg opacity-0 pointer-events-none transition-opacity group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto group-focus-within/tip:opacity-100 group-focus-within/tip:pointer-events-auto"
                >
                  Tip: Filter by class, select students, then print. Cards are sized for CR80
                  (credit-card) format — use &quot;Actual size&quot; in print settings for best
                  results.
                </span>
              </span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Select students and print standard CR80 identity cards.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={selectedStudents.length === 0}
              className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              Preview Cards
              {selectedStudents.length > 0 ? ` (${selectedStudents.length})` : ''}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={selectedStudents.length === 0}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm disabled:opacity-40"
            >
              <FiPrinter size={16} />
              Print {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
            </button>
          </div>
        </div>

        <div className="space-y-3 print:hidden">
          <button
            type="button"
            onClick={() => setFiltersExpanded((p) => !p)}
            className={`border px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
              hasActiveFilters
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'hover:bg-gray-50'
            }`}
          >
            <FiFilter size={15} />
            Filters
            {filtersExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>

          {filtersExpanded && (
            <div className="bg-white border rounded-lg px-4 py-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 relative">
                <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name or admission no..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All Classes</option>
                <option value={UNASSIGNED_CLASS_FILTER}>Unassigned</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                disabled={!classFilter || classFilter === UNASSIGNED_CLASS_FILTER}
              >
                <option value="">All Sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setClassFilter('');
                    setSectionFilter('');
                  }}
                  className="md:col-span-4 text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  <FiX size={14} /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow print:hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          ) : (
            <VirtualizedStudentSelectTable
              students={students}
              selectedIds={selectedIds}
              onToggle={toggleStudent}
              onToggleAll={toggleAll}
            />
          )}
        </div>
      </div>

      {showPreviewModal && selectedStudents.length > 0 && (
        <AppModal open={showPreviewModal} onClose={() => setShowPreviewModal(false)}>
          <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-white shadow-xl overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 print:hidden">
              <div>
                <h2 className="text-base font-semibold text-gray-900">ID Card Preview</h2>
                <p className="text-sm text-gray-500">
                  {selectedStudents.length} card{selectedStudents.length !== 1 ? 's' : ''} selected
                </p>
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
                  aria-label="Close preview"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 print:overflow-visible print:p-0">
              <div
                id="id-cards-print-root"
                className="id-cards-grid flex flex-wrap justify-center gap-4"
              >
                {selectedStudents.map((student) => (
                  <StudentIdCard key={student.id} student={student} school={schoolInfo} />
                ))}
              </div>
            </div>
          </div>
        </AppModal>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #id-cards-print-root,
          #id-cards-print-root * {
            visibility: visible;
          }
          #id-cards-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .id-cards-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 85.6mm);
            gap: 4mm;
            justify-content: center;
          }
          .id-card-sheet {
            page-break-inside: avoid;
          }
          .id-card {
            box-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: A4 portrait;
            margin: 2mm;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
