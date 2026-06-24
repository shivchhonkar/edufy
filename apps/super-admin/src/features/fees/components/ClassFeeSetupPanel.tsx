'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSettings } from '@/shared/SettingsContext';
import { getDefaultAcademicYearConfig } from '@/lib/academic-year-utils';
import type { Class } from '@/shared/types';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import {
  SETUP_FEE_COLUMNS,
  buildEmptyFeeRow,
  type ClassFeeRow,
  type FeeColumnKey,
} from '@/features/fees/utils/fee-setup';

const INPUT =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none';
const LABEL = 'block text-xs font-medium text-gray-600 mb-1';
const BTN_PRIMARY =
  'inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
const BTN_SECONDARY =
  'inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors';

interface ClassFeeSetupPanelProps {
  onMessage?: (text: string, type?: 'success' | 'error') => void;
}

export default function ClassFeeSetupPanel({ onMessage }: ClassFeeSetupPanelProps) {
  const { settings } = useSettings();
  const academicYear = settings.academic_year || getDefaultAcademicYearConfig().name;

  const [classes, setClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [feeCategories, setFeeCategories] = useState<{ id: number; name: string }[]>([]);
  const [feeSetupRows, setFeeSetupRows] = useState<ClassFeeRow[]>([]);
  const [feeSetupLoading, setFeeSetupLoading] = useState(false);
  const [bulkTuition, setBulkTuition] = useState('');
  const [saving, setSaving] = useState(false);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    onMessage?.(text, type);
  };

  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      if (data.success) setClasses(data.data);
      else setClasses([]);
    } catch {
      setClasses([]);
    } finally {
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
      const structures = structData.success ? structData.data : [];

      const rows = classes.map((cls) => {
        const row = buildEmptyFeeRow(cls);
        for (const col of SETUP_FEE_COLUMNS) {
          const match = structures.find(
            (s: { class_id: number; fee_type: string; frequency: string; id: number; amount: string }) =>
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

  const applyBulkTuition = () => {
    const amount = bulkTuition.trim();
    if (!amount) return;
    setFeeSetupRows((prev) =>
      prev.map((row) => ({
        ...row,
        fees: { ...row.fees, tuition: { ...row.fees.tuition, amount } },
      })),
    );
    showMsg(`Tuition fee ₹${amount} applied to all classes`);
  };

  const fillDefaultFees = () => {
    setFeeSetupRows(classes.map((cls) => buildEmptyFeeRow(cls)));
    showMsg('Default fee amounts filled for all classes');
  };

  const saveFeeSetup = async (): Promise<boolean> => {
    if (feeSetupRows.length === 0) {
      showMsg('Create classes first before setting up fees', 'error');
      return false;
    }

    let categories = feeCategories;
    if (categories.length === 0) {
      categories = await ensureFeeCategories();
    }
    const categoryByName = Object.fromEntries(categories.map((c) => [c.name, c.id]));

    setSaving(true);
    let saved = 0;
    let skipped = 0;

    for (const row of feeSetupRows) {
      for (const col of SETUP_FEE_COLUMNS) {
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

    await loadFeeSetup();

    if (saved > 0) {
      await fetch('/api/setup/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_step: 'fee_setup' }),
      });
    }

    showMsg(
      skipped > 0
        ? `Saved ${saved} fee structure(s). ${skipped} skipped.`
        : `Saved ${saved} fee structure(s) for ${feeSetupRows.length} class(es)`,
    );
    setSaving(false);
    return saved > 0;
  };

  if (classesLoading) {
    return <p className="py-8 text-center text-sm text-gray-500">Loading classes...</p>;
  }

  if (classes.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
        No classes found. Create classes under{' '}
        <Link href="/settings/setup" className="font-medium underline">
          School Setup
        </Link>{' '}
        or{' '}
        <Link href="/academics/classes" className="font-medium underline">
          Academics → Classes
        </Link>{' '}
        before configuring fees.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
          <RupeeIcon size={13} className="text-brand" />
          Fee setup per class — academic year:{' '}
          <span className="font-semibold">{academicYear}</span>
        </p>
        <p className="text-[11px] text-gray-500">
          Set tuition (monthly) and other fees for each class. Transport fee is assigned per student
          separately.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-end gap-2">
            <div>
              <label className={LABEL}>Apply tuition to all (₹)</label>
              <input
                type="number"
                min={0}
                value={bulkTuition}
                onChange={(e) => setBulkTuition(e.target.value)}
                className={`${INPUT} w-28`}
                placeholder="3500"
              />
            </div>
            <button type="button" onClick={applyBulkTuition} className={BTN_SECONDARY}>
              Apply
            </button>
          </div>
          <button type="button" onClick={fillDefaultFees} className={BTN_SECONDARY}>
            Fill defaults
          </button>
        </div>
      </div>

      {feeSetupLoading ? (
        <p className="py-8 text-center text-xs text-gray-500">Loading fee setup...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-gray-50">
                <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">
                  Class
                </th>
                {SETUP_FEE_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-2 py-2 text-left font-medium text-gray-600"
                  >
                    <div>{col.label}</div>
                    <div className="text-[10px] font-normal text-gray-400">{col.frequency}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {feeSetupRows.map((row) => (
                <tr key={row.classId} className="hover:bg-gray-50/50">
                  <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-2 font-medium text-gray-900">
                    {row.className}
                  </td>
                  {SETUP_FEE_COLUMNS.map((col) => (
                    <td key={col.key} className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={row.fees[col.key].amount}
                        onChange={(e) => updateFeeCell(row.classId, col.key, e.target.value)}
                        className="w-20 rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveFeeSetup}
          disabled={saving || feeSetupLoading}
          className={BTN_PRIMARY}
        >
          {saving ? 'Saving...' : 'Save fee structures'}
        </button>
        <Link href="/fees/setup/structures" className={BTN_SECONDARY}>
          Manage fee structures
        </Link>
      </div>
    </div>
  );
}
