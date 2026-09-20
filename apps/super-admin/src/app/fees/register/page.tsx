'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import { printHtmlDocument } from '@/features/students/utils/print-html';
import { useClassSectionOptions } from '@/features/fees/hooks/useClassSectionOptions';
import FeesClassSectionFilters from '@/features/fees/components/FeesClassSectionFilters';
import { useEnrollmentSession } from '@/shared/context/EnrollmentContext';
import { useSettings } from '@/shared/SettingsContext';

type RegisterView = 'detailed' | 'discounted' | 'without_discount';

interface RegisterRow {
  id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name?: string;
  receipt_number: string;
  payment_date: string;
  payment_method: string;
  amount_paid: string | number;
  discount_applied?: string | number;
  remarks?: string;
  status: string;
  is_misc?: boolean;
}

export default function FeeRegisterPage() {
  const { settings } = useSettings();
  const { selectedAcademicYear } = useEnrollmentSession();
  const academicYear = selectedAcademicYear?.name || settings.academic_year || '';
  const [view, setView] = useState<RegisterView>('detailed');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState<RegisterRow[]>([]);
  const { classes, sections, classId, sectionId, setClassId, setSectionId, loadingSections } = useClassSectionOptions();

  const load = useCallback(async () => {
    const params = new URLSearchParams({ view, academic_year: academicYear });
    if (classId) params.set('class_id', classId);
    if (search) params.set('search', search);
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    const res = await fetch(`/api/fees/register?${params}`);
    const data = await res.json();
    if (data.success) setRows(data.data || []);
  }, [view, academicYear, classId, search, fromDate, toDate]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const printRegister = () => {
    printHtmlDocument(
      'Fee Register',
      `<h1>Fee Register</h1>
       <table>
         <thead><tr><th>Receipt</th><th>Date</th><th>Student</th><th>Class</th><th>Mode</th><th>Discount</th><th>Amount</th></tr></thead>
         <tbody>${rows
           .map(
             (row) =>
               `<tr><td>${row.receipt_number}</td><td>${String(row.payment_date).slice(0, 10)}</td><td>${row.first_name} ${row.last_name}</td><td>${row.class_name || ''}</td><td>${row.payment_method}</td><td>${row.discount_applied || 0}</td><td>${row.amount_paid}</td></tr>`
           )
           .join('')}</tbody>
       </table>`
    );
  };

  return (
    <div className="space-y-4">
      <FeesPageHeader
        title="Fee Register"
        description="Discounted, without-discount, and detailed receipt register."
        actions={
          <button type="button" onClick={printRegister} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
            Print
          </button>
        }
      />
      <div className="flex flex-wrap gap-2">
        {(['detailed', 'discounted', 'without_discount'] as RegisterView[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setView(item)}
            className={`rounded-lg px-3 py-1.5 text-sm ${view === item ? 'bg-primary-600 text-white' : 'border bg-white'}`}
          >
            {item === 'without_discount' ? 'Without discount' : item === 'discounted' ? 'Discounted' : 'Detailed'}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student or receipt"
          className="min-w-[200px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <FeesClassSectionFilters
          classes={classes}
          sections={sections}
          classId={classId}
          sectionId={sectionId}
          onClassChange={setClassId}
          onSectionChange={setSectionId}
          loadingSections={loadingSections}
        />
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Receipt</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2 text-right">Discount</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">No receipts in this register.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    {row.receipt_number}
                    {row.is_misc ? <span className="ml-1 text-xs text-amber-700">misc</span> : null}
                  </td>
                  <td className="px-3 py-2">{String(row.payment_date).slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/fees/ledger/${row.student_id}`} className="text-primary-700 hover:underline">
                      {row.first_name} {row.last_name}
                    </Link>
                    <div className="text-xs text-gray-500">{row.admission_number}</div>
                  </td>
                  <td className="px-3 py-2">{row.class_name || '—'}</td>
                  <td className="px-3 py-2 capitalize">{row.payment_method}</td>
                  <td className="px-3 py-2 text-right">{formatFeeCurrency(row.discount_applied)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatFeeCurrency(row.amount_paid)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
