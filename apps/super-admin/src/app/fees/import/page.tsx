'use client';

import { useState } from 'react';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useDialog } from '@/shared/context/DialogContext';
import { useSettings } from '@/shared/SettingsContext';

const SAMPLE = `admission_number,amount,payment_date,payment_method,remarks,discount
ADM001,2500,2026-04-10,cash,April tuition,0`;

export default function FeeImportPage() {
  const { alert } = useDialog();
  const { settings } = useSettings();
  const { selectedAcademicYear } = useEnrollmentSession();
  const academicYear = selectedAcademicYear?.name || settings.academic_year || '';
  const [csv, setCsv] = useState(SAMPLE);
  const [result, setResult] = useState<{ imported: number; failed: number; results: Array<{ admission_number: string; ok: boolean; error?: string; receipt_number?: string }> } | null>(null);
  const [saving, setSaving] = useState(false);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setCsv(await file.text());
  };

  const importRows = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/fees/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, academic_year: academicYear }),
      });
      const data = await res.json();
      if (!data.success) {
        await alert(data.error || 'Import failed', { title: 'Error', type: 'error' });
        return;
      }
      setResult(data.data);
      await alert(data.message, { title: 'Import complete', type: 'success' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <FeesPageHeader title="Import from Excel / CSV" description="Import fee receipts using admission number and amount." />
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
          className="text-sm"
        />
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
        />
        <p className="text-xs text-gray-500">
          Required columns: admission_number, amount. Optional: payment_date, payment_method, remarks, discount, academic_year.
        </p>
        <button
          type="button"
          onClick={importRows}
          disabled={saving}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Importing...' : 'Import receipts'}
        </button>
      </div>
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {result.results.map((row, index) => (
            <div key={`${row.admission_number}-${index}`} className="px-4 py-2 text-sm flex justify-between">
              <span>{row.admission_number}</span>
              <span className={row.ok ? 'text-green-700' : 'text-red-700'}>
                {row.ok ? row.receipt_number : row.error}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
