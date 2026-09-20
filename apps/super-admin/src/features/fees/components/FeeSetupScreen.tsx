'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiEdit2,
  FiExternalLink,
  FiHelpCircle,
  FiInfo,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { useSettings } from '@/shared/SettingsContext';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { getDefaultAcademicYearConfig } from '@/lib/academic-year-utils';
import type { Class } from '@/shared/types';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import FeeSetupSkeleton from '@/features/fees/components/FeeSetupSkeleton';
import {
  CLASS_CATEGORY_LABELS,
  countByCategory,
  filterClassesByCategory,
  type ClassCategoryKey,
} from '@/features/fees/utils/fee-setup-categories';
import {
  CORE_FEE_COLUMNS,
  OPTIONAL_FEE_COLUMNS,
  buildDefaultOptionalConfig,
  buildEmptyFeeRow,
  formatFeeFrequency,
  getActiveFeeColumns,
  type ClassFeeRow,
  type FeeColumnKey,
  type OptionalFeeConfig,
  type OptionalFeeKey,
} from '@/features/fees/utils/fee-setup';

const INPUT =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none';
const BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

interface FeeSetupScreenProps {
  onMessage?: (text: string, type?: 'success' | 'error') => void;
}

type FeeStructureRecord = {
  id: number;
  class_id: number;
  fee_type: string;
  frequency: string;
  amount: string;
  is_active?: boolean;
};

const CLASSES_FETCH_TIMEOUT_MS = 12000;

const CORE_CARD_STYLES: Record<string, { border: string; bg: string; badge: string; dot: string }> = {
  tuition: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/80',
    badge: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  registration: {
    border: 'border-violet-200',
    bg: 'bg-violet-50/80',
    badge: 'bg-violet-100 text-violet-800',
    dot: 'bg-violet-500',
  },
  annual: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/80',
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
  },
  other: {
    border: 'border-rose-200',
    bg: 'bg-rose-50/80',
    badge: 'bg-rose-100 text-rose-800',
    dot: 'bg-rose-500',
  },
};

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

type CoreFeeEditTarget =
  | {
      kind: 'core';
      key: 'tuition' | 'registration';
      label: string;
      frequencyLabel: string;
      shortLabel: string;
    }
  | {
      kind: 'annual';
      label: string;
      frequencyLabel: string;
    };

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
      {n}
    </span>
  );
}

export default function FeeSetupScreen({ onMessage }: FeeSetupScreenProps) {
  const { settings } = useSettings();
  const { academicYears, selectedAcademicYear, setSelectedAcademicYearId } = useEnrollmentSession();
  const defaultYear = settings.academic_year || getDefaultAcademicYearConfig().name;
  const academicYear = selectedAcademicYear?.name || defaultYear;

  const [classes, setClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesLoadError, setClassesLoadError] = useState<string | null>(null);
  const [feeCategories, setFeeCategories] = useState<{ id: number; name: string }[]>([]);
  const [feeSetupRows, setFeeSetupRows] = useState<ClassFeeRow[]>([]);
  const [feeSetupLoading, setFeeSetupLoading] = useState(false);
  const [optionalConfig, setOptionalConfig] = useState(buildDefaultOptionalConfig());
  const [bulkTuition, setBulkTuition] = useState('3500');
  const [bulkRegistration, setBulkRegistration] = useState('500');
  const [bulkAnnual, setBulkAnnual] = useState('2000');
  const [structureName, setStructureName] = useState('Standard Fee Structure');
  const [studentCount, setStudentCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [classSearch, setClassSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ClassCategoryKey>('all');
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [showOptionalModal, setShowOptionalModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [copyFromClassId, setCopyFromClassId] = useState<number | null>(null);
  const [coreFeeEdit, setCoreFeeEdit] = useState<CoreFeeEditTarget | null>(null);
  const [coreFeeEditAmount, setCoreFeeEditAmount] = useState('');
  const [coreFeeApplyAll, setCoreFeeApplyAll] = useState(true);
  const snapshotRef = useRef<string>('');

  const activeColumns = useMemo(() => getActiveFeeColumns(optionalConfig), [optionalConfig]);
  const enabledOptionalCount = useMemo(
    () => OPTIONAL_FEE_COLUMNS.filter((col) => optionalConfig[col.key].enabled).length,
    [optionalConfig],
  );
  const categoryCounts = useMemo(() => countByCategory(classes), [classes]);
  const filteredClasses = useMemo(
    () => filterClassesByCategory(classes, categoryFilter, classSearch),
    [classes, categoryFilter, classSearch],
  );

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    onMessage?.(text, type);
  };

  const markDirty = () => setDirty(true);

  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    setClassesLoadError(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CLASSES_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch('/api/classes', { cache: 'no-store', signal: controller.signal });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setClasses([]);
        setClassesLoadError(data.error || 'Could not load classes');
        return;
      }
      setClasses(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setClasses([]);
      setClassesLoadError(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Loading classes timed out. Please try again.'
          : 'Could not load classes. Please try again.',
      );
    } finally {
      window.clearTimeout(timeoutId);
      setClassesLoading(false);
    }
  }, []);

  const fetchStudentCount = useCallback(async () => {
    try {
      const res = await fetch('/api/students?status=active&limit=1');
      const data = await res.json();
      if (data.success && data.pagination?.total != null) {
        setStudentCount(data.pagination.total);
      }
    } catch {
      setStudentCount(0);
    }
  }, []);

  useEffect(() => {
    void fetchClasses();
    void fetchStudentCount();
  }, [fetchClasses, fetchStudentCount]);

  const ensureFeeCategories = async () => {
    const res = await fetch('/api/fees/categories?is_active=true');
    const data = await res.json();
    if (data.success && data.data.length > 0) {
      setFeeCategories(data.data);
      return data.data as { id: number; name: string }[];
    }
    await fetch('/api/settings/initialize-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ensure_categories' }),
    });
    const res2 = await fetch('/api/fees/categories?is_active=true');
    const data2 = await res2.json();
    if (data2.success) setFeeCategories(data2.data);
    return data2.success ? data2.data : [];
  };

  const loadFeeSetup = useCallback(async () => {
    if (classes.length === 0) {
      setFeeSetupRows([]);
      return;
    }
    setFeeSetupLoading(true);
    try {
      await ensureFeeCategories();
      const structRes = await fetch(
        `/api/fees/structures?academic_year=${encodeURIComponent(academicYear)}&is_active=true`,
      );
      const structData = await structRes.json();
      const structures: FeeStructureRecord[] = structData.success ? structData.data : [];

      const nextOptional = buildDefaultOptionalConfig();
      for (const col of OPTIONAL_FEE_COLUMNS) {
        const match = structures.find((s) => s.fee_type === col.fee_type);
        if (match) {
          nextOptional[col.key] = {
            ...nextOptional[col.key],
            enabled: true,
            frequency: match.frequency === 'monthly' ? 'monthly' : 'yearly',
            bulkAmount: String(parseFloat(match.amount) || col.defaultAmount),
          };
        }
      }
      setOptionalConfig(nextOptional);

      const tuitionMatch = structures.find((s) => s.fee_type === 'Tuition Fee');
      if (tuitionMatch) setBulkTuition(String(parseFloat(tuitionMatch.amount) || 3500));
      const regMatch = structures.find((s) => s.fee_type === 'Registration Fee');
      if (regMatch) setBulkRegistration(String(parseFloat(regMatch.amount) || 500));

      const rows = classes.map((cls) => {
        const row = buildEmptyFeeRow(cls);
        const allColumns = getActiveFeeColumns(nextOptional);
        for (const col of allColumns) {
          const match = structures.find(
            (s) =>
              s.class_id === cls.id &&
              s.fee_type === col.fee_type &&
              s.frequency === col.frequency,
          );
          if (match) {
            row.fees[col.key] = {
              amount: String(parseFloat(match.amount) || 0),
              structureId: match.id,
            };
          }
        }
        for (const col of OPTIONAL_FEE_COLUMNS) {
          const match = structures.find(
            (s) => s.class_id === cls.id && s.fee_type === col.fee_type,
          );
          if (match) {
            row.fees[col.key] = {
              amount: String(parseFloat(match.amount) || col.defaultAmount),
              structureId: match.id,
            };
          }
        }
        return row;
      });

      setFeeSetupRows(rows);
      setExpandedClassId((prev) => prev ?? rows[0]?.classId ?? null);
      snapshotRef.current = JSON.stringify({ rows, optional: nextOptional, bulkTuition, bulkRegistration });
      setDirty(false);
    } finally {
      setFeeSetupLoading(false);
    }
  }, [classes, academicYear]);

  useEffect(() => {
    void loadFeeSetup();
  }, [loadFeeSetup]);

  const updateFeeCell = (classId: number, key: FeeColumnKey, amount: string) => {
    markDirty();
    setFeeSetupRows((prev) =>
      prev.map((row) =>
        row.classId === classId
          ? { ...row, fees: { ...row.fees, [key]: { ...row.fees[key], amount } } }
          : row,
      ),
    );
  };

  const applyBulkAmount = (key: FeeColumnKey, amount: string, label: string) => {
    const trimmed = amount.trim();
    if (!trimmed) return;
    markDirty();
    setFeeSetupRows((prev) =>
      prev.map((row) => ({
        ...row,
        fees: { ...row.fees, [key]: { ...row.fees[key], amount: trimmed } },
      })),
    );
    showMsg(`${label} ₹${trimmed} applied to all classes`);
  };

  const applyAnnualBulk = (amountOverride?: string) => {
    const amount = (amountOverride ?? bulkAnnual).trim();
    if (!amount) return;
    markDirty();
    const yearlyKeys = OPTIONAL_FEE_COLUMNS.filter((c) => c.defaultFrequency === 'yearly').map(
      (c) => c.key,
    );
    setOptionalConfig((prev) => {
      const next = { ...prev };
      for (const key of yearlyKeys) {
        next[key] = { ...next[key], enabled: true, frequency: 'yearly', bulkAmount: amount };
      }
      return next;
    });
    setFeeSetupRows((prev) =>
      prev.map((row) => {
        const fees = { ...row.fees };
        for (const key of yearlyKeys) {
          fees[key] = { ...fees[key], amount };
        }
        return { ...row, fees };
      }),
    );
    showMsg(`Annual charges ₹${amount} applied to yearly fee types`);
  };

  const updateOptionalConfig = (key: OptionalFeeKey, patch: Partial<OptionalFeeConfig>) => {
    markDirty();
    setOptionalConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const copyFeesFromClass = (targetClassId: number, sourceClassId: number) => {
    const source = feeSetupRows.find((r) => r.classId === sourceClassId);
    if (!source) return;
    markDirty();
    setFeeSetupRows((prev) =>
      prev.map((row) =>
        row.classId === targetClassId
          ? { ...row, fees: { ...source.fees } }
          : row,
      ),
    );
    showMsg(`Copied fee structure from ${source.className}`);
    setCopyFromClassId(null);
  };

  const countActiveFeesForClass = (row: ClassFeeRow) =>
    activeColumns.filter((col) => {
      const amt = parseFloat(row.fees[col.key]?.amount || '0');
      return !Number.isNaN(amt) && amt > 0;
    }).length;

  const summaryStats = useMemo(() => {
    let mandatory = 0;
    let optional = 0;
    for (const col of activeColumns) {
      if (col.key === 'tuition' || col.key === 'registration') mandatory += 1;
      else optional += 1;
    }
    const tuitionAmounts = feeSetupRows
      .map((r) => parseFloat(r.fees.tuition?.amount || '0'))
      .filter((n) => !Number.isNaN(n) && n > 0);
    const avgMonthly =
      tuitionAmounts.length > 0
        ? Math.round(tuitionAmounts.reduce((a, b) => a + b, 0) / tuitionAmounts.length)
        : 0;
    return {
      totalClasses: classes.length,
      activeFeeTypes: activeColumns.length,
      mandatory,
      optional,
      avgMonthly,
    };
  }, [activeColumns, feeSetupRows, classes.length]);

  const saveFeeSetup = async () => {
    if (feeSetupRows.length === 0) {
      showMsg('Create classes first before setting up fees', 'error');
      return;
    }
    let categories = feeCategories;
    if (categories.length === 0) categories = await ensureFeeCategories();
    const categoryByName = Object.fromEntries(categories.map((c) => [c.name, c.id]));

    setSaving(true);
    let saved = 0;
    let deactivated = 0;
    let skipped = 0;
    const columnsToSave = getActiveFeeColumns(optionalConfig);

    for (const row of feeSetupRows) {
      for (const col of columnsToSave) {
        const cell = row.fees[col.key];
        const amount = parseFloat(cell.amount);
        if (!cell.amount.trim() || Number.isNaN(amount) || amount < 0) continue;
        const payload = {
          class_id: row.classId,
          category_id: categoryByName[col.fee_type] || null,
          fee_type: col.fee_type,
          amount,
          frequency: col.frequency,
          academic_year: academicYear,
          description: `${col.fee_type} for ${row.className}`,
          late_fee_percentage: 2,
          late_fee_days: 7,
          is_active: true,
        };
        if (cell.structureId) {
          const res = await fetch('/api/fees/structures', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: cell.structureId, ...payload }),
          });
          const data = await res.json();
          if (data.success) saved += 1;
          else skipped += 1;
        } else {
          const res = await fetch('/api/fees/structures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (data.success) saved += 1;
          else skipped += 1;
        }
      }
    }

    const disabledFeeTypes = OPTIONAL_FEE_COLUMNS.filter(
      (col) => !optionalConfig[col.key].enabled,
    ).map((col) => col.fee_type);

    if (disabledFeeTypes.length > 0) {
      const deactivateRes = await fetch('/api/fees/structures/deactivate-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academic_year: academicYear, fee_types: disabledFeeTypes }),
      });
      const deactivateData = await deactivateRes.json();
      if (deactivateData.success) {
        deactivated = deactivateData.data?.structuresDeactivated ?? disabledFeeTypes.length;
      }
    }

    await fetch('/api/fees/auto-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cleanup_orphaned', academic_year: academicYear }),
    });

    await loadFeeSetup();
    if (saved > 0) {
      await fetch('/api/setup/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_step: 'fee_setup' }),
      });
    }
    const parts = [`Saved ${saved} fee structure(s)`];
    if (deactivated > 0) parts.push(`${deactivated} optional fee(s) turned off`);
    if (skipped > 0) parts.push(`${skipped} skipped`);
    showMsg(parts.join('. ') + '.');
    setSaving(false);
    setDirty(false);
  };

  const handleDiscard = () => {
    void loadFeeSetup();
    showMsg('Changes discarded', 'success');
  };

  const openCoreFeeEdit = (target: CoreFeeEditTarget) => {
    const amount =
      target.kind === 'core'
        ? target.key === 'tuition'
          ? bulkTuition
          : bulkRegistration
        : bulkAnnual;
    setCoreFeeEditAmount(amount);
    setCoreFeeApplyAll(true);
    setCoreFeeEdit(target);
  };

  const closeCoreFeeEdit = () => {
    setCoreFeeEdit(null);
    setCoreFeeEditAmount('');
  };

  const saveCoreFeeEdit = () => {
    const trimmed = coreFeeEditAmount.trim();
    if (!coreFeeEdit || !trimmed) {
      showMsg('Enter a valid amount', 'error');
      return;
    }
    const amount = parseFloat(trimmed);
    if (Number.isNaN(amount) || amount < 0) {
      showMsg('Enter a valid amount', 'error');
      return;
    }

    const normalized = String(amount);

    if (coreFeeEdit.kind === 'core') {
      if (coreFeeEdit.key === 'tuition') setBulkTuition(normalized);
      else setBulkRegistration(normalized);
      markDirty();
      if (coreFeeApplyAll) {
        applyBulkAmount(coreFeeEdit.key, normalized, coreFeeEdit.shortLabel);
      }
    } else {
      setBulkAnnual(normalized);
      markDirty();
      if (coreFeeApplyAll) applyAnnualBulk(normalized);
    }

    closeCoreFeeEdit();
  };

  if (classesLoading || feeSetupLoading) {
    return <FeeSetupSkeleton />;
  }

  if (classes.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
        {classesLoadError && (
          <p className="mb-4 text-sm text-red-700">{classesLoadError}</p>
        )}
        <FiAlertCircle className="mx-auto mb-3 text-amber-700" size={28} />
        <h2 className="text-base font-semibold text-amber-950">No classes set up yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-amber-900/90">
          Create your class structure first, then return here to configure fees.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/academics/classes"
            className={`${BTN} bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700`}
          >
            Set up classes
            <FiExternalLink size={14} />
          </Link>
          <button type="button" onClick={() => void fetchClasses()} className={`${BTN} border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50`}>
            <FiRefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const categoryTabs: ClassCategoryKey[] = [
    'all',
    'pre-primary',
    'primary',
    'middle',
    'secondary',
    'senior',
  ];

  return (
    <div className="space-y-5 pb-28">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-lg font-medium text-gray-900">Fee Setup</h1>
        <button
          type="button"
          onClick={() => setShowHowItWorks(true)}
          className={`${BTN} border border-gray-200 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50`}
        >
          <FiPlay size={14} className="text-blue-600" />
          How it works?
        </button>
      </div>

      {/* Step 1 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          {/* <StepBadge n={1} /> */}
          <h2 className="text-base font-semibold text-gray-900">
            Select Academic Session
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Academic Session</label>
            <select
              value={selectedAcademicYear?.id ?? ''}
              onChange={(e) => {
                const id = parseInt(e.target.value, 10);
                if (Number.isFinite(id)) setSelectedAcademicYearId(id);
                markDirty();
              }}
              className={INPUT}
            >
              {academicYears.length === 0 ? (
                <option value="">{academicYear}</option>
              ) : (
                academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Fee Structure Name</label>
            <input
              type="text"
              value={structureName}
              onChange={(e) => {
                setStructureName(e.target.value);
                markDirty();
              }}
              className={INPUT}
              placeholder="Standard Fee Structure"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:pb-0.5">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              Active
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
              <FiUsers size={14} className="text-gray-400" />
              Used for <strong className="font-semibold text-gray-900">{studentCount}</strong> students
            </span>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-3">
              {/* <StepBadge n={2} /> */}
              <h2 className="text-base font-semibold text-gray-900">Select Fee Types</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Select the fee for each class.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowOptionalModal(true)}
            className={`${BTN} text-blue-600 hover:text-blue-700 px-2 py-1`}
          >
            <FiPlus size={14} />
            Add Fee Type
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CORE_FEE_COLUMNS.map((col) => {
            const style = CORE_CARD_STYLES[col.key];
            const bulk = col.key === 'tuition' ? bulkTuition : bulkRegistration;
            return (
              <div
                key={col.key}
                className={`rounded-xl border p-4 ${style.border} ${style.bg}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    <p className="text-sm font-semibold text-gray-900">{col.label}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                    {formatFeeFrequency(col.frequency)}
                  </span>
                </div>
                <p className="mt-3 text-lg font-bold text-gray-900 tabular-nums">
                  ₹ {parseFloat(bulk || '0').toLocaleString('en-IN')}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    openCoreFeeEdit({
                      kind: 'core',
                      key: col.key,
                      label: col.label,
                      frequencyLabel: formatFeeFrequency(col.frequency),
                      shortLabel: col.shortLabel,
                    })
                  }
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </div>
            );
          })}

          <div className={`rounded-xl border p-4 ${CORE_CARD_STYLES.annual.border} ${CORE_CARD_STYLES.annual.bg}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${CORE_CARD_STYLES.annual.dot}`} />
                <p className="text-sm font-semibold text-gray-900">Annual Charges</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CORE_CARD_STYLES.annual.badge}`}>
                Yearly
              </span>
            </div>
            <p className="mt-3 text-lg font-bold text-gray-900 tabular-nums">
              ₹ {parseFloat(bulkAnnual || '0').toLocaleString('en-IN')}
            </p>
            <button
              type="button"
              onClick={() =>
                openCoreFeeEdit({
                  kind: 'annual',
                  label: 'Annual Charges',
                  frequencyLabel: 'Yearly',
                })
              }
              className="mt-2 text-xs font-medium text-blue-600 hover:underline"
            >
              Edit
            </button>
          </div>

          <div className={`rounded-xl border p-4 ${CORE_CARD_STYLES.other.border} ${CORE_CARD_STYLES.other.bg}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${CORE_CARD_STYLES.other.dot}`} />
                <p className="text-sm font-semibold text-gray-900">Other Fee</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CORE_CARD_STYLES.other.badge}`}>
                Optional
              </span>
            </div>
            <p className="mt-3 text-lg font-bold text-gray-900">{enabledOptionalCount} added</p>
            <button
              type="button"
              onClick={() => setShowOptionalModal(true)}
              className="mt-2 text-xs font-medium text-blue-600 hover:underline"
            >
              Manage
            </button>
          </div>
        </div>
      </section>

      {/* Step 3 + sidebar */}
      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* <StepBadge n={3} /> */}
              <h2 className="text-base font-semibold text-gray-900">Set Fees For Each Class</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className={`${BTN} border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50`}
              >
                Bulk Edit
              </button>
              <button
                type="button"
                onClick={() => setCopyFromClassId(expandedClassId)}
                className={`${BTN} border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50`}
              >
                <FiCopy size={13} />
                Copy Structure
              </button>
            </div>
          </div>

          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="search"
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
              placeholder="Search class..."
              className={`${INPUT} pl-9`}
            />
          </div>

          <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
            {categoryTabs.map((key) => {
              const count = categoryCounts[key];
              if (key !== 'all' && count === 0) return null;
              const label = key === 'all' ? 'All' : CLASS_CATEGORY_LABELS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategoryFilter(key)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    categoryFilter === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {filteredClasses.map((cls) => {
              const row = feeSetupRows.find((r) => r.classId === cls.id);
              if (!row) return null;
              const expanded = expandedClassId === cls.id;
              const activeCount = countActiveFeesForClass(row);
              return (
                <div key={cls.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedClassId(expanded ? null : cls.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{cls.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        {activeCount} Active Fees
                      </span>
                      {expanded ? (
                        <FiChevronUp className="text-gray-400" />
                      ) : (
                        <FiChevronDown className="text-gray-400" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
                      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                        <table className="w-full min-w-[480px] text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                              <th className="px-3 py-2">Fee Type</th>
                              <th className="px-3 py-2">Frequency</th>
                              <th className="px-3 py-2">Amount (₹)</th>
                              <th className="px-3 py-2 w-16">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {activeColumns.map((col) => {
                              const isOptional = !CORE_FEE_COLUMNS.some((c) => c.key === col.key);
                              const enabled = isOptional
                                ? optionalConfig[col.key as OptionalFeeKey]?.enabled
                                : true;
                              return (
                                <tr key={col.key}>
                                  <td className="px-3 py-2 font-medium text-gray-900">{col.label}</td>
                                  <td className="px-3 py-2 text-gray-500">
                                    {formatFeeFrequency(col.frequency)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {isOptional && !enabled ? (
                                      <span className="flex items-center gap-2 text-gray-400">
                                        <ToggleSwitch
                                          checked={false}
                                          onChange={() =>
                                            updateOptionalConfig(col.key as OptionalFeeKey, {
                                              enabled: true,
                                            })
                                          }
                                          label={`Enable ${col.label}`}
                                        />
                                        Optional
                                      </span>
                                    ) : (
                                      <input
                                        type="number"
                                        min={0}
                                        value={row.fees[col.key]?.amount ?? ''}
                                        onChange={(e) =>
                                          updateFeeCell(cls.id, col.key, e.target.value)
                                        }
                                        className="w-28 rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                                        placeholder="0"
                                      />
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => updateFeeCell(cls.id, col.key, '')}
                                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                      title="Clear amount"
                                    >
                                      <FiTrash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setShowOptionalModal(true)}
                          className={`${BTN} border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-white`}
                        >
                          <FiPlus size={13} />
                          Add Fee
                        </button>
                        <button
                          type="button"
                          onClick={() => setCopyFromClassId(cls.id)}
                          className={`${BTN} border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-white`}
                        >
                          <FiCopy size={13} />
                          Copy From
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Structure Summary</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Total Classes</dt>
                <dd className="font-semibold text-gray-900">{summaryStats.totalClasses}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Active Fee Types</dt>
                <dd className="font-semibold text-gray-900">{summaryStats.activeFeeTypes}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Mandatory Fees</dt>
                <dd className="font-semibold text-gray-900">{summaryStats.mandatory}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Optional Fees</dt>
                <dd className="font-semibold text-gray-900">{summaryStats.optional}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2.5 text-sm">
              <p className="text-gray-700">
                Total Students: <strong>{studentCount}</strong>
              </p>
              <p className="text-gray-700">
                Avg. Monthly Fee:{' '}
                <strong>₹ {summaryStats.avgMonthly.toLocaleString('en-IN')}</strong>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
            <ul className="mt-2 space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <RupeeIcon size={14} />
                  Apply Increase / Decrease
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => showMsg('Rounding rules can be configured in advanced fee structures.')}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FiEdit2 size={14} />
                  Rounding Rule
                </button>
              </li>
              <li>
                <Link
                  href="/fees/setup/structures"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FiExternalLink size={14} />
                  Preview Fee Structure
                </Link>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <p className="font-medium">Tip</p>
            <p className="mt-1 leading-relaxed">
              You can copy fee structure from one class to another or use bulk edit to update
              multiple classes at once.
            </p>
          </div>
        </aside>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-gray-600">
            <FiInfo size={16} className={dirty ? 'text-amber-500' : 'text-gray-400'} />
            {dirty ? 'You have unsaved changes' : 'All changes saved'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!dirty || saving}
              className={`${BTN} border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50`}
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={() => void saveFeeSetup()}
              disabled={saving}
              className={`${BTN} bg-blue-600 px-4 py-2 text-white hover:bg-blue-700`}
            >
              <FiSave size={15} />
              {saving ? 'Saving…' : 'Save Fee Structure'}
            </button>
          </div>
        </div>
      </div>

      {/* Core fee edit modal */}
      {coreFeeEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Edit {coreFeeEdit.label}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {coreFeeEdit.frequencyLabel} fee · default amount for all classes
                </p>
              </div>
              <button
                type="button"
                onClick={closeCoreFeeEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>

            <label className="block text-sm font-medium text-gray-700">
              Amount (₹)
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  autoFocus
                  value={coreFeeEditAmount}
                  onChange={(e) => setCoreFeeEditAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveCoreFeeEdit();
                    if (e.key === 'Escape') closeCoreFeeEdit();
                  }}
                  className={`${INPUT} w-full py-2 pl-7 pr-3`}
                  placeholder="Enter amount"
                />
              </div>
            </label>

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={coreFeeApplyAll}
                onChange={(e) => setCoreFeeApplyAll(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Apply to all classes now
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCoreFeeEdit}
                className={`${BTN} border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCoreFeeEdit}
                className={`${BTN} bg-blue-600 px-4 py-2 text-white hover:bg-blue-700`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional fees modal */}
      {showOptionalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Manage optional fees</h3>
              <button type="button" onClick={() => setShowOptionalModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {OPTIONAL_FEE_COLUMNS.map((col) => {
                const config = optionalConfig[col.key];
                return (
                  <div key={col.key} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{col.label}</p>
                        <p className="text-xs text-gray-500">{col.description}</p>
                      </div>
                      <ToggleSwitch
                        checked={config.enabled}
                        onChange={(enabled) => updateOptionalConfig(col.key, { enabled })}
                        label={`Enable ${col.label}`}
                      />
                    </div>
                    {config.enabled && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="number"
                          min={0}
                          value={config.bulkAmount}
                          onChange={(e) =>
                            updateOptionalConfig(col.key, { bulkAmount: e.target.value })
                          }
                          className={`${INPUT} flex-1 py-1.5 text-xs`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            applyBulkAmount(col.key, config.bulkAmount, col.label)
                          }
                          className={`${BTN} border border-gray-200 px-3 py-1.5 text-xs text-gray-700`}
                        >
                          Apply all
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowOptionalModal(false)}
              className={`${BTN} mt-4 w-full bg-blue-600 py-2 text-white hover:bg-blue-700`}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Bulk edit modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Bulk edit amounts</h3>
              <button type="button" onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {CORE_FEE_COLUMNS.map((col) => (
                <div key={col.key}>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{col.label}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      defaultValue={col.key === 'tuition' ? bulkTuition : bulkRegistration}
                      id={`bulk-${col.key}`}
                      className={INPUT}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`bulk-${col.key}`) as HTMLInputElement;
                        applyBulkAmount(col.key, el?.value || '', col.shortLabel);
                      }}
                      className={`${BTN} border border-gray-200 px-3 text-xs text-gray-700`}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowBulkModal(false)}
              className={`${BTN} mt-4 w-full border border-gray-300 py-2 text-gray-700`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Copy from modal */}
      {copyFromClassId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Copy fees from class</h3>
            <p className="mt-1 text-xs text-gray-500">Select a source class to copy amounts into the target.</p>
            <select
              className={`${INPUT} mt-3`}
              defaultValue=""
              onChange={(e) => {
                const srcId = parseInt(e.target.value, 10);
                if (Number.isFinite(srcId) && copyFromClassId != null) {
                  copyFeesFromClass(copyFromClassId, srcId);
                }
              }}
            >
              <option value="" disabled>
                Select class…
              </option>
              {feeSetupRows
                .filter((r) => r.classId !== copyFromClassId)
                .map((r) => (
                  <option key={r.classId} value={r.classId}>
                    {r.className}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => setCopyFromClassId(null)}
              className={`${BTN} mt-4 w-full border border-gray-300 py-2 text-gray-700`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* How it works */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <FiHelpCircle className="text-blue-600" size={22} />
              <h3 className="text-base font-semibold text-gray-900">How fee setup works</h3>
            </div>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600">
              <li>Select the academic session and name your fee structure.</li>
              <li>Set default amounts for tuition, registration, and optional fees.</li>
              <li>Fine-tune per-class amounts or copy from another class.</li>
              <li>Save — fees sync to student billing automatically.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowHowItWorks(false)}
              className={`${BTN} mt-4 w-full bg-blue-600 py-2 text-white hover:bg-blue-700`}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
