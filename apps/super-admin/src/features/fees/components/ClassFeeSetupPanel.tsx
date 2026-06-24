'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiCheck, FiChevronDown, FiChevronUp, FiExternalLink, FiRefreshCw, FiSave } from 'react-icons/fi';
import { useSettings } from '@/shared/SettingsContext';
import { getDefaultAcademicYearConfig } from '@/lib/academic-year-utils';
import type { Class } from '@/shared/types';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
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
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none';
const BTN_PRIMARY =
  'inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
const BTN_SECONDARY =
  'inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors';

interface ClassFeeSetupPanelProps {
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

function NoClassesPrompt({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <FiAlertCircle className="text-amber-700" size={22} />
      </div>
      <h2 className="text-base font-semibold text-amber-950">No classes set up yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-amber-900/90">
        Fee setup needs at least one class. Create your class structure first, then return here to
        configure tuition and other fees.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/academics/classes"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          Set up classes first
          <FiExternalLink size={14} />
        </Link>
        {onRetry && (
          <button type="button" onClick={onRetry} className={BTN_SECONDARY}>
            <FiRefreshCw size={13} />
            Check again
          </button>
        )}
      </div>
    </div>
  );
}

function FeeSetupCollapsibleSection({
  step,
  title,
  description,
  summary,
  open,
  onToggle,
  children,
}: {
  step: number;
  title: string;
  description: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-5 text-left hover:bg-gray-50/80 transition-colors"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            {open ? (
              <FiChevronUp size={18} className="shrink-0 text-gray-400" />
            ) : (
              <FiChevronDown size={18} className="shrink-0 text-gray-400" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{open ? description : summary || description}</p>
        </div>
      </button>
      {open && <div className="border-t border-gray-100 px-5 pb-5 pt-4">{children}</div>}
    </section>
  );
}

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
        checked ? 'bg-brand' : 'bg-gray-200'
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

export default function ClassFeeSetupPanel({ onMessage }: ClassFeeSetupPanelProps) {
  const { settings } = useSettings();
  const academicYear = settings.academic_year || getDefaultAcademicYearConfig().name;

  const [classes, setClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesLoadError, setClassesLoadError] = useState<string | null>(null);
  const [feeCategories, setFeeCategories] = useState<{ id: number; name: string }[]>([]);
  const [feeSetupRows, setFeeSetupRows] = useState<ClassFeeRow[]>([]);
  const [feeSetupLoading, setFeeSetupLoading] = useState(false);
  const [optionalConfig, setOptionalConfig] = useState(buildDefaultOptionalConfig());
  const [bulkTuition, setBulkTuition] = useState('');
  const [bulkRegistration, setBulkRegistration] = useState('');
  const [saving, setSaving] = useState(false);
  const [coreFeesOpen, setCoreFeesOpen] = useState(false);
  const [optionalFeesOpen, setOptionalFeesOpen] = useState(false);

  const activeColumns = useMemo(() => getActiveFeeColumns(optionalConfig), [optionalConfig]);
  const enabledOptionalCount = useMemo(
    () => OPTIONAL_FEE_COLUMNS.filter((col) => optionalConfig[col.key].enabled).length,
    [optionalConfig],
  );

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    onMessage?.(text, type);
  };

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
      if (error instanceof DOMException && error.name === 'AbortError') {
        setClassesLoadError('Loading classes timed out. Please try again.');
      } else {
        setClassesLoadError('Could not load classes. Please try again.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

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
            frequency: match.frequency === 'monthly' ? 'monthly' : 'yearly',
            bulkAmount: String(parseFloat(match.amount) || col.defaultAmount),
          };
        }
      }
      setOptionalConfig(nextOptional);

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
    } finally {
      setFeeSetupLoading(false);
    }
  }, [classes, academicYear]);

  useEffect(() => {
    loadFeeSetup();
  }, [loadFeeSetup]);

  const updateFeeCell = (classId: number, key: FeeColumnKey, amount: string) => {
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
    setFeeSetupRows((prev) =>
      prev.map((row) => ({
        ...row,
        fees: { ...row.fees, [key]: { ...row.fees[key], amount: trimmed } },
      })),
    );
    showMsg(`${label} ₹${trimmed} applied to all classes`);
  };

  const suggestAmounts = () => {
    setFeeSetupRows(classes.map((cls) => buildEmptyFeeRow(cls)));
    showMsg('Suggested amounts filled for all classes');
  };

  const updateOptionalConfig = (key: OptionalFeeKey, patch: Partial<OptionalFeeConfig>) => {
    setOptionalConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const applyOptionalBulk = (key: OptionalFeeKey) => {
    const config = optionalConfig[key];
    if (!config.enabled) return;
    applyBulkAmount(key, config.bulkAmount, OPTIONAL_FEE_COLUMNS.find((c) => c.key === key)!.label);
  };

  const saveFeeSetup = async () => {
    if (feeSetupRows.length === 0) {
      showMsg('Create classes first before setting up fees', 'error');
      return;
    }

    let categories = feeCategories;
    if (categories.length === 0) {
      categories = await ensureFeeCategories();
    }
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
        body: JSON.stringify({
          academic_year: academicYear,
          fee_types: disabledFeeTypes,
        }),
      });
      const deactivateData = await deactivateRes.json();
      if (deactivateData.success) {
        deactivated = Math.max(
          deactivated,
          deactivateData.data?.structuresDeactivated ?? disabledFeeTypes.length,
        );
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
  };

  if (classesLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-gray-500">Loading classes...</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-4">
        {classesLoadError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {classesLoadError}
          </p>
        )}
        <NoClassesPrompt onRetry={fetchClasses} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step 1 — Core fees */}
      <FeeSetupCollapsibleSection
        step={1}
        title="Core fees"
        description={`Required for every student — academic year ${academicYear}`}
        summary="Monthly tuition & one-time registration — click to expand"
        open={coreFeesOpen}
        onToggle={() => setCoreFeesOpen((prev) => !prev)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {CORE_FEE_COLUMNS.map((col) => {
            const bulkValue = col.key === 'tuition' ? bulkTuition : bulkRegistration;
            const setBulk = col.key === 'tuition' ? setBulkTuition : setBulkRegistration;

            return (
              <div key={col.key} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{col.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{col.description}</p>
                    <span className="mt-2 inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-brand border border-brand/20">
                      {formatFeeFrequency(col.frequency)}
                    </span>
                  </div>
                  <RupeeIcon size={16} className="text-brand shrink-0 mt-0.5" />
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">
                      Amount for all classes (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={bulkValue}
                      onChange={(e) => setBulk(e.target.value)}
                      className={INPUT}
                      placeholder={String(col.defaultAmount)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => applyBulkAmount(col.key, bulkValue, col.shortLabel)}
                    className={BTN_SECONDARY}
                  >
                    Apply
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </FeeSetupCollapsibleSection>

      {/* Step 2 — Optional fees */}
      <FeeSetupCollapsibleSection
        step={2}
        title="Optional fees"
        description="Turn on only the fee types your school charges. Disabled fees are hidden from billing."
        summary={
          enabledOptionalCount > 0
            ? `${enabledOptionalCount} fee type(s) enabled — click to expand`
            : 'All optional fees off — click to expand and enable'
        }
        open={optionalFeesOpen}
        onToggle={() => setOptionalFeesOpen((prev) => !prev)}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {OPTIONAL_FEE_COLUMNS.map((col) => {
            const config = optionalConfig[col.key];
            return (
              <div
                key={col.key}
                className={`rounded-lg border p-4 transition-colors ${
                  config.enabled
                    ? 'border-brand/30 bg-brand/5'
                    : 'border-gray-100 bg-gray-50/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{col.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{col.description}</p>
                  </div>
                  <ToggleSwitch
                    checked={config.enabled}
                    onChange={(enabled) => updateOptionalConfig(col.key, { enabled })}
                    label={`Enable ${col.label} fee`}
                  />
                </div>

                {config.enabled && (
                  <div className="mt-3 space-y-2 border-t border-brand/10 pt-3">
                    <div className="flex gap-1">
                      {(['monthly', 'yearly'] as const).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => updateOptionalConfig(col.key, { frequency: freq })}
                          className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors ${
                            config.frequency === freq
                              ? 'bg-brand text-white'
                              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-[11px] text-gray-500 mb-1">Default amount (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={config.bulkAmount}
                          onChange={(e) =>
                            updateOptionalConfig(col.key, { bulkAmount: e.target.value })
                          }
                          className={`${INPUT} py-1.5 text-xs`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => applyOptionalBulk(col.key)}
                        className={BTN_SECONDARY}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </FeeSetupCollapsibleSection>

      {/* Step 3 — Per-class amounts */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              3
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Amounts by class</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Fine-tune amounts per class. Transport fee is set separately per student.
              </p>
            </div>
          </div>
          <button type="button" onClick={suggestAmounts} className={BTN_SECONDARY}>
            Suggest amounts
          </button>
        </div>

        {feeSetupLoading ? (
          <p className="py-10 text-center text-xs text-gray-500">Loading saved fees...</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 px-3 py-2.5 text-left font-semibold text-gray-700">
                    Class
                  </th>
                  {activeColumns.map((col) => (
                    <th
                      key={col.key}
                      className="whitespace-nowrap px-2 py-2.5 text-left font-semibold text-gray-700"
                    >
                      <div>{col.shortLabel}</div>
                      <div className="text-[10px] font-normal text-gray-400">
                        {formatFeeFrequency(col.frequency)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feeSetupRows.map((row) => (
                  <tr key={row.classId} className="hover:bg-gray-50/60">
                    <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-2 font-medium text-gray-900">
                      {row.className}
                    </td>
                    {activeColumns.map((col) => (
                      <td key={col.key} className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={row.fees[col.key].amount}
                          onChange={(e) => updateFeeCell(row.classId, col.key, e.target.value)}
                          className="w-24 rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                          placeholder="0"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveFeeSetup}
            disabled={saving || feeSetupLoading}
            className={BTN_PRIMARY}
          >
            <FiSave size={15} />
            {saving ? 'Saving...' : 'Save all fees'}
          </button>
          <p className="text-[11px] text-gray-500">
            {activeColumns.length} fee type(s) active across {feeSetupRows.length} class(es)
          </p>
          <Link
            href="/fees/setup/structures"
            className="ml-auto text-xs text-gray-500 hover:text-brand underline-offset-2 hover:underline"
          >
            Advanced: manage individual structures
          </Link>
        </div>
      </section>

      <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
        <FiCheck size={12} />
        Tip: use Apply on core and optional fees first, then adjust individual classes if needed.
      </p>
    </div>
  );
}
