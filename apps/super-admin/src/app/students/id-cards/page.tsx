'use client';

import AppModal, { AppModalShell } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import VirtualizedStudentSelectTable from '@/features/students/components/VirtualizedStudentSelectTable';
import { usePreselectStudentIdsFromUrl } from '@/features/students/hooks/usePreselectStudentFromUrl';
import StudentIdCard from '@/features/students/components/StudentIdCard';
import { buildStudentIdCardSchoolInfo } from '@/features/students/utils/student-id-card-school-info';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import type { Student } from '@/shared/types';
import { FiPrinter, FiSearch, FiX } from 'react-icons/fi';

const primaryButtonClass =
  'inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs text-white hover:bg-primary-700 disabled:opacity-40';
const quietButtonClass =
  'inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40';
const fieldClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';

const STUDENTS_FETCH_LIMIT = 50000;
const UNASSIGNED_CLASS_FILTER = 'unassigned';
const MAX_ID_CARD_SELECTION = 10;

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
          <div className="py-12 text-center text-xs text-gray-500">Loading…</div>
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
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
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

  const schoolInfo = useMemo(
    () => buildStudentIdCardSchoolInfo(settings, reportSettings),
    [settings, reportSettings],
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
        status: 'active',
      });
      if (classFilter) params.set('class_id', classFilter);
      if (sectionFilter && classFilter !== UNASSIGNED_CLASS_FILTER) {
        params.set('section_id', sectionFilter);
      }

      const response = await fetch(`/api/students?${params}`);
      const data = await response.json();
      if (data.success) {
        setStudents(data.data);
        setTotalStudents(data.pagination?.total ?? data.data.length);
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
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= MAX_ID_CARD_SELECTION) {
        void alert(`You can select up to ${MAX_ID_CARD_SELECTION} students at a time for ID cards.`, {
          title: 'Selection limit',
          type: 'warning',
        });
        return prev;
      }
      next.add(id);
      return next;
    });
  };

  const toggleAll = (ids: number[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!select) {
        for (const id of ids) next.delete(id);
        return next;
      }
      let limitReached = false;
      for (const id of ids) {
        if (next.size >= MAX_ID_CARD_SELECTION) {
          limitReached = true;
          break;
        }
        next.add(id);
      }
      if (limitReached) {
        void alert(`You can select up to ${MAX_ID_CARD_SELECTION} students at a time for ID cards.`, {
          title: 'Selection limit',
          type: 'warning',
        });
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
  const listScopeLabel = hasActiveFilters
    ? `${students.length} shown`
    : `${totalStudents} student${totalStudents !== 1 ? 's' : ''} · all classes`;

  const selectionLabel =
    selectedStudents.length > 0
      ? `${selectedStudents.length}/${MAX_ID_CARD_SELECTION}`
      : '';

  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100dvh-7rem)] flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 print:hidden">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Student ID Cards</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Select up to {MAX_ID_CARD_SELECTION} students. Cards print at CR80 size — use Actual size in print settings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={selectedStudents.length === 0}
              className={quietButtonClass}
            >
              Preview{selectionLabel ? ` (${selectionLabel})` : ''}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={selectedStudents.length === 0}
              className={primaryButtonClass}
            >
              <FiPrinter size={14} />
              Print{selectionLabel ? ` (${selectionLabel})` : ''}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm print:hidden">
          <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Students</h2>
              <p className="mt-0.5 text-xs text-gray-500">{loading ? 'Loading…' : listScopeLabel}</p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-[minmax(14rem,18rem)_9rem_9rem_auto]">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <FiSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="search"
                  placeholder="Name or admission no."
                  className={`${fieldClass} pl-8`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className={fieldClass}
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                aria-label="Class"
              >
                <option value="">All classes</option>
                <option value={UNASSIGNED_CLASS_FILTER}>Unassigned</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className={fieldClass}
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                disabled={!classFilter || classFilter === UNASSIGNED_CLASS_FILTER}
                aria-label="Section"
              >
                <option value="">All sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setClassFilter('');
                    setSectionFilter('');
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
          ) : (
            <VirtualizedStudentSelectTable
              students={students}
              selectedIds={selectedIds}
              onToggle={toggleStudent}
              onToggleAll={toggleAll}
              fillHeight
              maxSelection={MAX_ID_CARD_SELECTION}
            />
          )}
        </div>
      </div>

      <AppModal open={showPreviewModal && selectedStudents.length > 0} onClose={() => setShowPreviewModal(false)}>
        {showPreviewModal && selectedStudents.length > 0 && (
          <AppModalShell
            header={
              <>
                <div className="print:hidden">
                  <h2 className="text-lg font-medium text-gray-900">ID card preview</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {selectedStudents.length} card{selectedStudents.length === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700 print:hidden"
                  aria-label="Close preview"
                >
                  <FiX size={18} />
                </button>
              </>
            }
            footer={
              <div className="flex w-full justify-end gap-2 print:hidden">
                <button type="button" onClick={() => setShowPreviewModal(false)} className={quietButtonClass}>
                  Close
                </button>
                <button type="button" onClick={handlePrint} className={primaryButtonClass}>
                  <FiPrinter size={14} />
                  Print
                </button>
              </div>
            }
          >
            <div className="p-4 print:p-0 sm:p-6">
              <div id="id-cards-print-root" className="id-cards-grid flex flex-wrap justify-center gap-4">
                {selectedStudents.map((student) => (
                  <StudentIdCard key={student.id} student={student} school={schoolInfo} />
                ))}
              </div>
            </div>
          </AppModalShell>
        )}
      </AppModal>

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
