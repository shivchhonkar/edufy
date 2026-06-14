'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import BulkEditSpreadsheet from '@/features/students/components/BulkEditSpreadsheet';
import BulkEditPrintRangeModal from '@/features/students/components/BulkEditPrintRangeModal';
import { useDialog } from '@/shared/context/DialogContext';
import { Student } from '@/shared/types';
import {
  BulkEditRow,
  isRowChanged,
  rowSnapshot,
  studentToBulkEditRow,
} from '@/features/students/utils/bulk-edit';
import {
  downloadBulkEditCsv,
  getPrintBatchRanges,
  MAX_BROWSER_PRINT_ROWS,
  printBulkEditRowsViaIframe,
} from '@/features/students/utils/bulk-edit-export';
import { FiArrowLeft, FiChevronDown, FiChevronUp, FiDownload, FiFilter, FiPrinter, FiSave, FiSearch } from 'react-icons/fi';

const MAX_FETCH_LIMIT = 50000;
const LIMIT_PRESETS = [50, 100, 300, 500, 1000, 4000] as const;
const UNASSIGNED_CLASS_FILTER = 'unassigned';

interface ClassOption {
  id: number;
  name: string;
  academic_year: string;
}

interface SectionOption {
  id: number;
  class_id?: number;
  name: string;
  assigned_classes?: Array<{ id: number; name: string }>;
}

type LimitMode = 'all' | 'preset' | 'custom';

export default function StudentsBulkEditPage() {
  const { alert, confirm } = useDialog();
  const [rows, setRows] = useState<BulkEditRow[]>([]);
  const [originalSnapshot, setOriginalSnapshot] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [matchedTotal, setMatchedTotal] = useState(0);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [allSections, setAllSections] = useState<SectionOption[]>([]);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [limitMode, setLimitMode] = useState<LimitMode>('all');
  const [limitPreset, setLimitPreset] = useState<string>('50');
  const [customLimit, setCustomLimit] = useState('300');

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedClassFilter, setAppliedClassFilter] = useState('');
  const [appliedSectionFilter, setAppliedSectionFilter] = useState('');
  const [appliedClassName, setAppliedClassName] = useState('');
  const [appliedSectionName, setAppliedSectionName] = useState('');
  const [appliedLimit, setAppliedLimit] = useState(MAX_FETCH_LIMIT);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [showPrintRangeModal, setShowPrintRangeModal] = useState(false);

  const hasUnsavedChangesRef = useRef(false);

  const effectiveLimit = useMemo(() => {
    if (limitMode === 'all') return MAX_FETCH_LIMIT;
    if (limitMode === 'custom') {
      const parsed = parseInt(customLimit, 10);
      if (!parsed || parsed < 1) return 50;
      return Math.min(parsed, MAX_FETCH_LIMIT);
    }
    const parsed = parseInt(limitPreset, 10);
    return parsed > 0 ? parsed : 50;
  }, [limitMode, limitPreset, customLimit]);

  const changedRowIds = useMemo(() => {
    const ids = new Set<number>();
    rows.forEach((row) => {
      if (isRowChanged(row, originalSnapshot)) ids.add(row.id);
    });
    return ids;
  }, [rows, originalSnapshot]);

  useEffect(() => {
    hasUnsavedChangesRef.current = changedRowIds.size > 0;
  }, [changedRowIds]);

  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (data.success) setClasses(data.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }, []);

  const fetchSections = useCallback(async (classId: string) => {
    try {
      const response = await fetch(`/api/sections?class_id=${classId}`);
      const data = await response.json();
      if (data.success) setSections(data.data);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  }, []);

  const fetchAllSections = useCallback(async () => {
    try {
      const response = await fetch('/api/sections');
      const data = await response.json();
      if (data.success) setAllSections(data.data);
    } catch (error) {
      console.error('Error fetching all sections:', error);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchAllSections();
  }, [fetchClasses, fetchAllSections]);

  useEffect(() => {
    if (classFilter && classFilter !== UNASSIGNED_CLASS_FILTER) {
      fetchSections(classFilter);
    } else {
      setSections([]);
      setSectionFilter('');
    }
  }, [classFilter, fetchSections]);

  const loadStudents = useCallback(
    async (
      options: {
        searchValue: string;
        classId: string;
        sectionId: string;
        limit: number;
        skipUnsavedWarning?: boolean;
      }
    ) => {
      if (!options.skipUnsavedWarning && hasUnsavedChangesRef.current) {
        const proceed = await confirm(
          'You have unsaved changes. Applying new filters will discard them. Continue?',
          { title: 'Unsaved changes', type: 'warning', confirmText: 'Discard & reload' }
        );
        if (!proceed) return false;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          search: options.searchValue,
          limit: String(options.limit),
          page: '1',
        });
        if (options.classId) params.set('class_id', options.classId);
        if (options.sectionId && options.classId !== UNASSIGNED_CLASS_FILTER) {
          params.set('section_id', options.sectionId);
        }

        const response = await fetch(`/api/students?${params}`);
        const data = await response.json();
        if (data.success) {
          const mapped = (data.data as Student[]).map(studentToBulkEditRow);
          setRows(mapped);
          const matchCount = data.pagination?.total ?? mapped.length;
          setMatchedTotal(matchCount);
          if (!options.classId && !options.sectionId && !options.searchValue) {
            setTotalStudents(matchCount);
          }

          const snapshot = new Map<number, string>();
          mapped.forEach((row) => snapshot.set(row.id, rowSnapshot(row)));
          setOriginalSnapshot(snapshot);

          setAppliedSearch(options.searchValue);
          setAppliedClassFilter(options.classId);
          setAppliedSectionFilter(options.sectionId);
          setAppliedClassName(
            options.classId === UNASSIGNED_CLASS_FILTER
              ? 'Unassigned (no class)'
              : classes.find((c) => c.id.toString() === options.classId)?.name || ''
          );
          setAppliedSectionName(
            sections.find((s) => s.id.toString() === options.sectionId)?.name || ''
          );
          setAppliedLimit(options.limit);
          return true;
        }

        await alert(data.error || 'Failed to load students', { title: 'Error', type: 'error' });
        return false;
      } catch (error) {
        console.error('Error loading students for bulk edit:', error);
        await alert('Failed to load students', { title: 'Error', type: 'error' });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [alert, confirm, classes, sections]
  );

  useEffect(() => {
    loadStudents({
      searchValue: '',
      classId: '',
      sectionId: '',
      limit: MAX_FETCH_LIMIT,
      skipUnsavedWarning: true,
    });
  }, [loadStudents]);

  const handleApplyFilters = async () => {
    const className =
      classFilter === UNASSIGNED_CLASS_FILTER
        ? 'Unassigned (no class)'
        : classes.find((c) => c.id.toString() === classFilter)?.name || '';
    const sectionName = sections.find((s) => s.id.toString() === sectionFilter)?.name || '';

    const loaded = await loadStudents({
      searchValue: search,
      classId: classFilter,
      sectionId: classFilter === UNASSIGNED_CLASS_FILTER ? '' : sectionFilter,
      limit: effectiveLimit,
    });

    if (loaded) {
      setAppliedClassName(className);
      setAppliedSectionName(sectionName);
    }
  };

  const handleClearFilters = async () => {
    setSearch('');
    setClassFilter('');
    setSectionFilter('');
    setLimitMode('all');
    setLimitPreset('50');
    setCustomLimit('300');
    await loadStudents({
      searchValue: '',
      classId: '',
      sectionId: '',
      limit: MAX_FETCH_LIMIT,
    });
  };

  const hasPendingFilterChanges =
    search !== appliedSearch ||
    classFilter !== appliedClassFilter ||
    sectionFilter !== appliedSectionFilter ||
    effectiveLimit !== appliedLimit;

  const filteredRowIndices = useMemo(() => rows.map((_, index) => index), [rows]);

  const handleCellChange = useCallback(
    (rowIndex: number, key: keyof BulkEditRow, value: string) => {
      setRows((prev) => {
        const next = [...prev];
        const current = next[rowIndex];
        if (key === 'class_name' && value !== current.class_name) {
          next[rowIndex] = { ...current, class_name: value, section_name: '' };
        } else {
          next[rowIndex] = { ...current, [key]: value };
        }
        return next;
      });
    },
    []
  );

  const handleSave = async () => {
    const changedRows = rows.filter((row) => isRowChanged(row, originalSnapshot));
    if (changedRows.length === 0) {
      await alert('No changes to save', { title: 'Bulk Edit', type: 'info' });
      return;
    }

    const proceed = await confirm(
      `Save changes for ${changedRows.length} student(s)?`,
      { title: 'Save bulk edits', confirmText: 'Save all changes' }
    );
    if (!proceed) return;

    setSaving(true);
    try {
      const response = await fetch('/api/students/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: changedRows }),
      });
      const data = await response.json();

      if (data.success) {
        const { updated, failed, errors } = data.data;
        if (failed > 0) {
          await alert(
            `Updated ${updated} student(s). ${failed} failed.\n\n${errors.slice(0, 5).join('\n')}${
              errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''
            }`,
            { title: 'Partial save', type: 'warning' }
          );
        } else {
          await alert(`Successfully updated ${updated} student(s)`, {
            title: 'Saved',
            type: 'success',
          });
        }
        await loadStudents({
          searchValue: appliedSearch,
          classId: appliedClassFilter,
          sectionId: appliedSectionFilter,
          limit: appliedLimit,
          skipUnsavedWarning: true,
        });
      } else {
        await alert(data.error || 'Failed to save changes', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Bulk save error:', error);
      await alert('An error occurred while saving', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const appliedLimitCapped = appliedLimit < matchedTotal;
  const hasAppliedFilters = Boolean(
    appliedSearch || appliedClassFilter || appliedSectionFilter || appliedLimitCapped
  );
  const appliedFilterCount = [
    appliedSearch,
    appliedClassFilter,
    appliedSectionFilter,
    appliedLimitCapped,
  ].filter(Boolean).length;

  const exportFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (appliedSearch) parts.push(`Search: "${appliedSearch}"`);
    if (appliedClassName) parts.push(`Class: ${appliedClassName}`);
    if (appliedSectionName) parts.push(`Section: ${appliedSectionName}`);
    if (appliedLimitCapped) parts.push(`Limited to first ${appliedLimit}`);
    return parts.length > 0 ? parts.join(' · ') : 'All students';
  }, [
    appliedSearch,
    appliedClassName,
    appliedSectionName,
    appliedLimitCapped,
    appliedLimit,
  ]);

  const handleDownload = () => {
    if (rows.length === 0) return;
    downloadBulkEditCsv(rows);
  };

  const executePrintRange = useCallback(
    (from: number, to: number) => {
      const rowsToPrint = rows.slice(from - 1, to);
      const batches = getPrintBatchRanges(rows.length);
      const batch = batches.find((item) => item.start === from && item.end === to);

      setPrinting(true);
      try {
        printBulkEditRowsViaIframe(rowsToPrint, {
          title: 'Bulk Edit Students',
          filterSummary: exportFilterSummary,
          totalCount: rows.length,
          printedCount: rowsToPrint.length,
          rangeStart: from,
          rangeEnd: to,
          batchNumber: batch?.batchIndex,
          totalBatches: batches.length,
        });
      } finally {
        window.setTimeout(() => setPrinting(false), 1500);
      }
    },
    [rows, exportFilterSummary]
  );

  const handlePrint = () => {
    if (rows.length === 0 || printing) return;

    if (rows.length > MAX_BROWSER_PRINT_ROWS) {
      setShowPrintRangeModal(true);
      return;
    }

    executePrintRange(1, rows.length);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-5rem)] gap-3">
        <div className="space-y-2 shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                href="/students"
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1"
              >
                <FiArrowLeft size={14} />
                Back to Students
              </Link>
              <h1 className="text-xl text-gray-900">Bulk Edit Students</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersExpanded((prev) => !prev)}
                aria-expanded={filtersExpanded}
                className={`border px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                  filtersExpanded || hasAppliedFilters
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <FiFilter size={15} />
                <span>Filters</span>
                {hasAppliedFilters && (
                  <span className="text-xs bg-primary-600 text-white px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {appliedFilterCount}
                  </span>
                )}
                {filtersExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={loading || rows.length === 0}
                className="border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm text-gray-700"
              >
                <FiDownload size={16} />
                Download
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={loading || rows.length === 0 || printing}
                className="border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm text-gray-700"
              >
                <FiPrinter size={16} />
                {printing ? 'Preparing...' : 'Print'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading || changedRowIds.size === 0}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                <FiSave size={16} />
                {saving ? 'Saving...' : `Save${changedRowIds.size ? ` (${changedRowIds.size})` : ''}`}
              </button>
            </div>
          </div>

          {filtersExpanded && (
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                <div className="relative xl:col-span-2">
                  <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                    placeholder="Search name, admission no., phone..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white"
                  />
                </div>

                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white"
                >
                  <option value="">All Classes</option>
                  <option value={UNASSIGNED_CLASS_FILTER}>Unassigned (no class)</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>

                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  disabled={!classFilter || classFilter === UNASSIGNED_CLASS_FILTER}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white disabled:bg-gray-50"
                >
                  <option value="">All Sections</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>

                <select
                  value={limitMode === 'preset' ? `preset:${limitPreset}` : limitMode}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'all') {
                      setLimitMode('all');
                    } else if (value === 'custom') {
                      setLimitMode('custom');
                    } else if (value.startsWith('preset:')) {
                      setLimitMode('preset');
                      setLimitPreset(value.replace('preset:', ''));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white"
                >
                  <option value="all">Show all matching</option>
                  {LIMIT_PRESETS.map((n) => (
                    <option key={n} value={`preset:${n}`}>
                      Show {n}
                    </option>
                  ))}
                  <option value="custom">Custom count</option>
                </select>

                {limitMode === 'custom' ? (
                  <input
                    type="number"
                    min={1}
                    max={MAX_FETCH_LIMIT}
                    value={customLimit}
                    onChange={(e) => setCustomLimit(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                    placeholder="e.g. 300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-gray-900 bg-white"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    disabled={loading}
                    className="w-full px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    <FiFilter size={14} />
                    Apply
                  </button>
                )}
              </div>

              {limitMode === 'custom' && (
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  <FiFilter size={14} />
                  Apply filters
                </button>
              )}

              {hasPendingFilterChanges && !loading && (
                <p className="text-xs text-amber-600">Filters changed — click Apply to reload</p>
              )}
            </div>
          )}

          {!filtersExpanded && hasAppliedFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">Filtered:</span>
              {appliedSearch && (
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                  &quot;{appliedSearch}&quot;
                </span>
              )}
              {appliedClassFilter && appliedClassName && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  {appliedClassName}
                </span>
              )}
              {appliedSectionFilter && appliedSectionName && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                  {appliedSectionName}
                </span>
              )}
              {appliedLimitCapped && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                  First {appliedLimit}
                </span>
              )}
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-gray-500 hover:text-gray-800 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-gray-100 text-sm text-gray-600 shrink-0">
            <div>
              {loading ? (
                'Loading students...'
              ) : (
                <>
                  <span className="font-semibold text-gray-900">{rows.length}</span>
                  {matchedTotal > rows.length ? (
                    <> of <span className="font-semibold text-gray-900">{matchedTotal}</span> matching</>
                  ) : (
                    <> student{rows.length !== 1 ? 's' : ''}</>
                  )}
                  {!appliedClassFilter && !appliedSectionFilter && !appliedSearch && (
                    <span className="text-xs text-gray-500 ml-1">(school total: {totalStudents})</span>
                  )}
                  {changedRowIds.size > 0 && (
                    <span className="ml-2 text-xs text-amber-700">· {changedRowIds.size} modified</span>
                  )}
                </>
              )}
            </div>
            {hasPendingFilterChanges && !loading && filtersExpanded && (
              <span className="text-xs text-amber-600">Apply filters to reload</span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          ) : (
            <BulkEditSpreadsheet
              rows={rows}
              rowIndices={filteredRowIndices}
              changedRowIds={changedRowIds}
              classes={classes}
              allSections={allSections}
              onCellChange={handleCellChange}
            />
          )}
        </div>
      </div>

      <BulkEditPrintRangeModal
        isOpen={showPrintRangeModal}
        totalCount={rows.length}
        onClose={() => setShowPrintRangeModal(false)}
        onPrint={(from, to) => executePrintRange(from, to)}
      />
    </DashboardLayout>
  );
}
