'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import FeesClassSectionFilters from '@/features/fees/components/FeesClassSectionFilters';
import { useClassSectionOptions } from '@/features/fees/hooks/useClassSectionOptions';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import { printHtmlDocument } from '@/features/students/utils/print-html';
import { ACADEMIC_MONTH_SEQUENCE_NAMES } from '@/lib/fees/AcademicYear';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useSettings } from '@/shared/SettingsContext';

type OutstandingView = 'class' | 'head' | 'monthly' | 'installment' | 'invoice' | 'summary';

const TABS: Array<{ id: OutstandingView; label: string }> = [
  { id: 'class', label: 'Class-wise' },
  { id: 'head', label: 'Head-wise' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'installment', label: 'Installments' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'summary', label: 'Summary' },
];

export default function FeeOutstandingPage() {
  const { settings } = useSettings();
  const { selectedAcademicYear } = useEnrollmentSession();
  const academicYear = selectedAcademicYear?.name || settings.academic_year || '';
  const [view, setView] = useState<OutstandingView>('class');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [summary, setSummary] = useState<{ rows: Array<Record<string, unknown>>; totals: Record<string, number> } | null>(null);
  const { classes, sections, classId, sectionId, setClassId, setSectionId, loadingSections } = useClassSectionOptions();

  const load = useCallback(async () => {
    if (view === 'summary') {
      const params = new URLSearchParams({ academic_year: academicYear });
      if (classId) params.set('class_id', classId);
      const res = await fetch(`/api/fees/summary?${params}`);
      const data = await res.json();
      if (data.success) setSummary(data.data);
      return;
    }
    const params = new URLSearchParams({
      view: view === 'invoice' ? 'class' : view,
      academic_year: academicYear,
    });
    if (classId) params.set('class_id', classId);
    const res = await fetch(`/api/fees/outstanding?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, [view, academicYear, classId]);

  useEffect(() => {
    load();
  }, [load]);

  const monthLabel = (month: unknown) => {
    const n = Number(month);
    return Number.isFinite(n) && n >= 1 && n <= 12 ? ACADEMIC_MONTH_SEQUENCE_NAMES[(n + 8) % 12] || String(n) : '—';
  };

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + parseFloat(String(row.outstanding || 0)), 0),
    [rows]
  );

  const printInvoice = () => {
    printHtmlDocument(
      'Fee Outstanding Invoice',
      `<h1>Outstanding Invoice</h1>
       <table>
         <thead><tr><th>Student</th><th>Class</th><th>Fee</th><th>Due date</th><th>Outstanding</th></tr></thead>
         <tbody>${rows
           .map(
             (row) =>
               `<tr><td>${row.first_name || ''} ${row.last_name || ''}</td><td>${row.class_name || ''}</td><td>${row.fee_type || ''}</td><td>${String(row.due_date || '').slice(0, 10)}</td><td>${row.outstanding || 0}</td></tr>`
           )
           .join('')}</tbody>
       </table>`
    );
  };

  return (
    <div className="space-y-4">
      <FeesPageHeader
        title="Fee Outstanding"
        description="Head-wise, monthly, installment, class-wise, invoice, and summary views."
        actions={
          view === 'invoice' ? (
            <button type="button" onClick={printInvoice} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
              Print invoices
            </button>
          ) : undefined
        }
      />
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${view === tab.id ? 'bg-primary-600 text-white' : 'border bg-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <FeesClassSectionFilters
          classes={classes}
          sections={sections}
          classId={classId}
          sectionId={sectionId}
          onClassChange={setClassId}
          onSectionChange={setSectionId}
          loadingSections={loadingSections}
        />
      </div>

      {view === 'summary' && summary ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2 text-right">Students</th>
                <th className="px-3 py-2 text-right">Billed</th>
                <th className="px-3 py-2 text-right">Collected</th>
                <th className="px-3 py-2 text-right">Discount</th>
                <th className="px-3 py-2 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => (
                <tr key={String(row.class_id || row.class_name)} className="border-t">
                  <td className="px-3 py-2">{String(row.class_name)}</td>
                  <td className="px-3 py-2 text-right">{String(row.student_count)}</td>
                  <td className="px-3 py-2 text-right">{formatFeeCurrency(row.billed as number)}</td>
                  <td className="px-3 py-2 text-right">{formatFeeCurrency(row.collected as number)}</td>
                  <td className="px-3 py-2 text-right">{formatFeeCurrency(row.discount as number)}</td>
                  <td className="px-3 py-2 text-right text-red-700">{formatFeeCurrency(row.outstanding as number)}</td>
                </tr>
              ))}
              <tr className="border-t font-medium">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right">{formatFeeCurrency(summary.totals.billed)}</td>
                <td className="px-3 py-2 text-right">{formatFeeCurrency(summary.totals.collected)}</td>
                <td className="px-3 py-2 text-right">{formatFeeCurrency(summary.totals.discount)}</td>
                <td className="px-3 py-2 text-right text-red-700">{formatFeeCurrency(summary.totals.outstanding)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : view === 'head' || view === 'monthly' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">{view === 'head' ? 'Fee head' : 'Month'}</th>
                <th className="px-3 py-2 text-right">Students</th>
                <th className="px-3 py-2 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t">
                  <td className="px-3 py-2">{view === 'head' ? String(row.fee_type) : monthLabel(row.month)}</td>
                  <td className="px-3 py-2 text-right">{String(row.student_count)}</td>
                  <td className="px-3 py-2 text-right text-red-700">{formatFeeCurrency(row.outstanding as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Total outstanding {formatFeeCurrency(total)}</p>
          <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Fee</th>
                  <th className="px-3 py-2">Due date</th>
                  <th className="px-3 py-2 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-gray-500">No outstanding dues.</td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={String(row.student_fee_id || row.id || index)} className="border-t">
                      <td className="px-3 py-2">
                        <Link href={`/fees/ledger/${row.student_id}`} className="text-primary-700 hover:underline">
                          {String(row.first_name || '')} {String(row.last_name || '')}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{String(row.class_name || '—')}</td>
                      <td className="px-3 py-2">{String(row.fee_type || 'Fee')}</td>
                      <td className="px-3 py-2">{String(row.due_date || '').slice(0, 10) || '—'}</td>
                      <td className="px-3 py-2 text-right text-red-700">{formatFeeCurrency(row.outstanding as number)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
