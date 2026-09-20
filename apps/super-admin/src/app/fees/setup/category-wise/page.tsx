'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import FeeSetupLinks from '@/features/fees/components/FeeSetupLinks';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useDialog } from '@/shared/context/DialogContext';
import { useSettings } from '@/shared/SettingsContext';
import { DEFAULT_STUDENT_LOOKUP_SETTINGS } from '@/lib/student-lookup-settings';
import type { Class } from '@/shared/types';

interface RateRow {
  class_id: number;
  fee_type: string;
  student_category: string;
  amount: number | string;
}

export default function CategoryWiseFeesPage() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const { selectedAcademicYear } = useEnrollmentSession();
  const academicYear = selectedAcademicYear?.name || settings.academic_year || '';
  const [classes, setClasses] = useState<Class[]>([]);
  const [classId, setClassId] = useState('');
  const [feeTypes, setFeeTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_STUDENT_LOOKUP_SETTINGS.caste_types.items);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/classes')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setClasses(data.data || []);
      });
    fetch('/api/settings/student-lookups')
      .then((res) => res.json())
      .then((data) => {
        const items = data?.data?.caste_types?.items;
        if (Array.isArray(items) && items.length) setCategories(items);
      })
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    if (!academicYear) return;
    const structureParams = new URLSearchParams({ academic_year: academicYear });
    if (classId) structureParams.set('class_id', classId);
    const [structuresRes, ratesRes] = await Promise.all([
      fetch(`/api/fees/structures?${structureParams}`),
      fetch(`/api/fees/category-rates?academic_year=${encodeURIComponent(academicYear)}${classId ? `&class_id=${classId}` : ''}`),
    ]);
    const structures = await structuresRes.json();
    const rates = await ratesRes.json();
    const types = Array.from(
      new Set<string>((structures.data || []).map((row: { fee_type?: string }) => String(row.fee_type || '')).filter(Boolean))
    );
    setFeeTypes(types);
    const next: Record<string, string> = {};
    for (const rate of (rates.data || []) as RateRow[]) {
      next[`${rate.class_id}:${rate.fee_type}:${rate.student_category}`] = String(rate.amount ?? '');
    }
    setAmounts(next);
  }, [academicYear, classId]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleClasses = useMemo(
    () => (classId ? classes.filter((item) => String(item.id) === classId) : classes),
    [classes, classId]
  );

  const save = async () => {
    const rates: RateRow[] = [];
    for (const cls of visibleClasses) {
      for (const feeType of feeTypes) {
        for (const category of categories) {
          const key = `${cls.id}:${feeType}:${category}`;
          const amount = parseFloat(amounts[key] || '');
          if (Number.isNaN(amount)) continue;
          rates.push({ class_id: cls.id, fee_type: feeType, student_category: category, amount });
        }
      }
    }
    setSaving(true);
    try {
      const res = await fetch('/api/fees/category-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rates: rates.map((rate) => ({ ...rate, academic_year: academicYear })),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        await alert(data.error || 'Failed to save', { title: 'Error', type: 'error' });
        return;
      }
      await alert('Category-wise fees saved', { title: 'Success', type: 'success' });
    } finally {
      setSaving(false);
    }
  };

  const apply = async () => {
    const res = await fetch('/api/fees/category-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apply: true, academic_year: academicYear, class_id: classId || undefined }),
    });
    const data = await res.json();
    await alert(data.message || data.error || 'Applied', { title: data.success ? 'Success' : 'Error', type: data.success ? 'success' : 'error' });
  };

  return (
    <div className="space-y-4">
      <FeesPageHeader title="Category-wise Fees" description="Set different amounts by student category (GEN, OBC, SC, ST)." />
      <FeeSetupLinks />
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          <option value="">All classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50">
          Save rates
        </button>
        <button type="button" onClick={apply} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
          Apply to student dues
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        {feeTypes.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">Add class-wise fee structures first.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">Fee head</th>
                {categories.map((category) => (
                  <th key={category} className="px-3 py-2">{category}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleClasses.flatMap((cls) =>
                feeTypes.map((feeType) => (
                  <tr key={`${cls.id}-${feeType}`} className="border-t">
                    <td className="px-3 py-2">{cls.name}</td>
                    <td className="px-3 py-2">{feeType}</td>
                    {categories.map((category) => {
                      const key = `${cls.id}:${feeType}:${category}`;
                      return (
                        <td key={category} className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={amounts[key] || ''}
                            onChange={(e) => setAmounts((prev) => ({ ...prev, [key]: e.target.value }))}
                            className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
