'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import VirtualizedTable, {
  type VirtualizedTableColumn,
} from '@/shared/components/common/VirtualizedTable';
import { printStudentDocumentReport } from '@/features/students/utils/student-document-report-print';
import { useSettings } from '@/shared/SettingsContext';
import { useDialog } from '@/shared/context/DialogContext';
import {
  DOCUMENT_REPORT_COLUMN_LABELS,
  DOCUMENT_REPORT_TABLE_MIN_WIDTH,
  documentStatusLabel,
  getDocumentStatusStyle,
  type DocumentReportColumn,
  type DocumentReportStatus,
  type StudentDocumentReportRow,
} from '@/lib/student-document-report';
import {
  FiBarChart2,
  FiChevronDown,
  FiChevronUp,
  FiFilter,
  FiPrinter,
  FiX,
} from 'react-icons/fi';

interface ClassOption {
  id: number;
  name: string;
}

interface SectionOption {
  id: number;
  class_id: number;
  name: string;
}

const DOCUMENT_COLUMNS: DocumentReportColumn[] = [
  'tc',
  'bc',
  'student_aadhar',
  'parents_aadhar',
  'student_photo',
  'father_photo',
  'mother_photo',
];

function LegendSwatch({ status }: { status: DocumentReportStatus }) {
  const style = getDocumentStatusStyle(status);
  return (
    <span
      className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-semibold border border-gray-300"
      style={style}
    >
      {documentStatusLabel(status)}
    </span>
  );
}

function StatusCell({ status }: { status: DocumentReportStatus }) {
  const style = getDocumentStatusStyle(status);
  return (
    <div
      className="absolute inset-0 flex items-center justify-center border border-gray-300 px-0.5 text-[10px] font-semibold leading-tight text-center"
      style={style}
    >
      {documentStatusLabel(status)}
    </div>
  );
}

export default function StudentReportsPage() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const [rows, setRows] = useState<StudentDocumentReportRow[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((d) => d.success && setClasses(d.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (classFilter) {
      fetch(`/api/sections?class_id=${classFilter}`)
        .then((r) => r.json())
        .then((d) => d.success && setSections(d.data))
        .catch(console.error);
    } else {
      setSections([]);
      setSectionFilter('');
    }
  }, [classFilter]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set('class_id', classFilter);
      if (sectionFilter) params.set('section_id', sectionFilter);
      if (missingOnly) params.set('missing_only', 'true');

      const response = await fetch(`/api/students/document-report?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setRows(data.data.items || []);
        setMissingCount(data.data.missing_count || 0);
      } else {
        await alert(data.error || 'Failed to load report', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to load student document report', { title: 'Error', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [alert, classFilter, missingOnly, sectionFilter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const hasActiveFilters = Boolean(classFilter || sectionFilter || missingOnly);
  const activeFilterCount = [classFilter, sectionFilter, missingOnly].filter(Boolean).length;

  const classLabel = classFilter
    ? classes.find((c) => String(c.id) === classFilter)?.name
    : undefined;
  const sectionLabel = sectionFilter
    ? sections.find((s) => String(s.id) === sectionFilter)?.name
    : undefined;

  const handlePrint = async () => {
    if (rows.length === 0) {
      await alert('No students to print for the selected filters.', {
        title: 'Nothing to print',
        type: 'warning',
      });
      return;
    }

    printStudentDocumentReport({
      schoolName: settings.school_name || 'School',
      academicYear: settings.academic_year,
      classLabel: classLabel || (classFilter ? undefined : 'All Classes'),
      sectionLabel,
      rows,
    });
  };

  const clearFilters = () => {
    setClassFilter('');
    setSectionFilter('');
    setMissingOnly(false);
  };

  const columns = useMemo<VirtualizedTableColumn<StudentDocumentReportRow>[]>(() => {
    const baseColumns: VirtualizedTableColumn<StudentDocumentReportRow>[] = [
      {
        key: 'sr',
        header: 'Sr No.',
        width: '52px',
        headerClassName: 'text-center',
        cellClassName: 'text-center text-xs text-gray-700',
        render: (_row, index) => <span className="text-xs text-gray-700">{index + 1}</span>,
      },
      {
        key: 'admission_number',
        header: 'Adm. No.',
        width: 'minmax(108px, 108px)',
        render: (row) => (
          <span className="block truncate text-xs font-medium text-gray-900" title={row.admission_number}>
            {row.admission_number}
          </span>
        ),
      },
      {
        key: 'class_name',
        header: 'Class',
        width: 'minmax(80px, 80px)',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (row) => <span className="text-xs text-gray-800">{row.class_name}</span>,
      },
      {
        key: 'section_name',
        header: 'Section',
        width: 'minmax(88px, 88px)',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (row) => <span className="text-xs text-gray-800">{row.section_name}</span>,
      },
      {
        key: 'student_name',
        header: 'Student Name',
        width: 'minmax(160px, 1fr)',
        render: (row) => (
          <span className="block truncate text-sm font-medium text-gray-900" title={row.student_name}>
            {row.student_name}
          </span>
        ),
      },
      {
        key: 'father_name',
        header: 'Father Name',
        width: 'minmax(150px, 1fr)',
        render: (row) => (
          <span className="block truncate text-xs text-gray-800" title={row.father_name}>
            {row.father_name}
          </span>
        ),
      },
      {
        key: 'first_adm_class',
        header: 'First Adm. Class',
        width: 'minmax(96px, 96px)',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (row) => <span className="text-xs text-gray-800">{row.first_adm_class}</span>,
      },
    ];

    const documentColumns = DOCUMENT_COLUMNS.map((column) => ({
      key: column,
      header: DOCUMENT_REPORT_COLUMN_LABELS[column],
      width: 'minmax(118px, 118px)',
      compact: true,
      headerClassName: 'text-center text-[10px]',
      cellClassName: 'relative text-center',
      render: (row: StudentDocumentReportRow) => <StatusCell status={row[column]} />,
    }));

    return [...baseColumns, ...documentColumns];
  }, []);

  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100dvh-7rem)] flex-col gap-3">
        <div className="space-y-2 shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                {/* <FiBarChart2 className="text-primary-600" /> */}
                Student Reports
              </h1>
              {/* <p className="text-sm text-gray-600 mt-0.5">
                Pending documents by class and section
              </p> */}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFiltersExpanded((prev) => !prev)}
                  aria-expanded={filtersExpanded}
                  className={`border px-2.5 py-1.5 rounded-md flex items-center gap-1.5 text-xs transition-colors ${
                    filtersExpanded || hasActiveFilters
                      ? 'border-primary-300 bg-primary-50 text-primary-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <FiFilter size={15} />
                  <span>Filters</span>
                  {hasActiveFilters && (
                    <span className="text-xs bg-primary-600 text-white px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                      {activeFilterCount}
                    </span>
                  )}
                  {filtersExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={loading || rows.length === 0}
                  className="bg-primary-600 text-white px-2.5 py-1.5 rounded-md hover:bg-primary-700 flex items-center gap-1.5 text-xs disabled:opacity-40"
                >
                  <FiPrinter size={14} />
                  Print Report
                </button>
              </div>
              {/*               <p className="text-[11px] text-gray-500 text-right max-w-sm">
                In the print dialog, disable headers/footers and enable background graphics for correct colors.
              </p> */}
            </div>
          </div>

          {filtersExpanded && (
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 bg-white"
                  value={classFilter}
                  onChange={(e) => {
                    setClassFilter(e.target.value);
                    setSectionFilter('');
                  }}
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 bg-white"
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  disabled={!classFilter}
                >
                  <option value="">All Sections</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
                <label className="md:col-span-2 flex items-center gap-2 text-xs text-gray-700 px-1">
                  <input
                    type="checkbox"
                    checked={missingOnly}
                    onChange={(e) => setMissingOnly(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Show only students with missing documents
                </label>
              </div>
              {hasActiveFilters && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {classFilter && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                        Class: {classLabel}
                      </span>
                    )}
                    {sectionFilter && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                        Section: {sectionLabel}
                      </span>
                    )}
                    {missingOnly && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs">
                        Missing documents only
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  >
                    <FiX size={14} />
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}

          {!filtersExpanded && hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">Filtered:</span>
              {classFilter && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{classLabel}</span>
              )}
              {sectionFilter && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{sectionLabel}</span>
              )}
              {missingOnly && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">Missing only</span>
              )}
              <button type="button" onClick={clearFilters} className="text-gray-500 hover:text-gray-800 underline">
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
          <div className="rounded-lg border bg-white px-3 py-2">
            <p className="text-xs text-gray-500">Students listed</p>
            <p className="text-lg text-gray-900">{loading ? '—' : rows.length}</p>
          </div>
          <div className="rounded-lg border bg-white px-3 py-2">
            <p className="text-xs text-gray-500">With missing docs</p>
            <p className="text-lg text-red-700">{loading ? '—' : missingCount}</p>
          </div>
          <div className="rounded-lg border bg-white px-3 py-2 md:col-span-2">
            <p className="text-xs text-gray-500 mb-1">Legend</p>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <LegendSwatch status="submitted" />
              <LegendSwatch status="not_submitted" />
              <LegendSwatch status="not_required" />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : (
            <div className="min-h-0 flex-1 h-full">
            <VirtualizedTable
              rows={rows}
              columns={columns}
              getRowKey={(row) => row.id}
              rowHeight={44}
              maxHeight="100%"
              minWidth={DOCUMENT_REPORT_TABLE_MIN_WIDTH}
              emptyMessage="No students found for the selected filters."
              rowClassName="hover:bg-gray-50 bg-white"
            />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
