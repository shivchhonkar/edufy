'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';
import { useSettings } from '@/shared/SettingsContext';
import { useFeesStudents } from '@/features/fees/hooks/useFeesStudents';
import { useFeesStats } from '@/features/fees/hooks/useFeesStats';
import { useClassSectionOptions } from '@/features/fees/hooks/useClassSectionOptions';
import VirtualizedTable from '@/shared/components/common/VirtualizedTable';
import FeesClassSectionFilters from '@/features/fees/components/FeesClassSectionFilters';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import { filterFeeStudents, matchesClassSection } from '@/features/fees/utils/student-filters';
import Link from 'next/link';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';

type ReportType = 'collection' | 'outstanding' | 'defaulters' | 'daily' | 'statements';

function ReportsContent() {
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') || 'collection') as ReportType;
  const { settings } = useSettings();
  const { students, loading: studentsLoading } = useFeesStudents(settings.academic_year);
  const { stats } = useFeesStats(settings.academic_year);
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const {
    classes,
    sections,
    classId,
    sectionId,
    setClassId,
    setSectionId,
    loadingSections,
  } = useClassSectionOptions();

  const studentById = useMemo(() => {
    const map = new Map<number, (typeof students)[number]>();
    for (const student of students) {
      map.set(student.id, student);
    }
    return map;
  }, [students]);

  useEffect(() => {
    fetch('/api/fees?limit=500')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPayments(d.data);
      });
  }, []);

  const defaulters = useMemo(() => {
    return filterFeeStudents(
      students.filter((s) => (s.pendingAmount || 0) > 0),
      { search: searchTerm, classId, sectionId },
    )
      .map((s) => ({
        ...s,
        daysOverdue: s.paymentStatus === 'overdue' ? 30 : 0,
      }))
      .sort((a, b) => (b.pendingAmount || 0) - (a.pendingAmount || 0));
  }, [students, searchTerm, classId, sectionId]);

  const paymentMatchesFilters = useMemo(() => {
    return (payment: Record<string, unknown>) => {
      if (modeFilter && String(payment.payment_method) !== modeFilter) return false;
      const student = studentById.get(Number(payment.student_id));
      if (!student) return !classId && !sectionId;
      return matchesClassSection(student, { classId, sectionId });
    };
  }, [modeFilter, classId, sectionId, studentById]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!paymentMatchesFilters(p)) return false;
      if (!searchTerm.trim()) return true;
      const student = studentById.get(Number(p.student_id));
      const q = searchTerm.toLowerCase();
      return (
        String(p.first_name).toLowerCase().includes(q) ||
        String(p.last_name).toLowerCase().includes(q) ||
        String(p.admission_number || '').toLowerCase().includes(q) ||
        student?.class_name?.toLowerCase().includes(q) ||
        student?.section_name?.toLowerCase().includes(q)
      );
    });
  }, [payments, paymentMatchesFilters, searchTerm, studentById]);

  const dailyBreakdown = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayPayments = payments.filter(
      (p) => String(p.payment_date).startsWith(today) && paymentMatchesFilters(p),
    );
    const byMode: Record<string, number> = {};
    for (const p of todayPayments) {
      const mode = String(p.payment_method || 'other');
      byMode[mode] = (byMode[mode] || 0) + parseFloat(String(p.amount_paid || 0));
    }
    return byMode;
  }, [payments, paymentMatchesFilters]);

  const FilterBar = (
    <div className="flex flex-wrap gap-3 mb-4">
      {(type === 'collection' || type === 'outstanding' || type === 'defaulters') && (
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student, class, or section..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      )}
      <FeesClassSectionFilters
        classes={classes}
        sections={sections}
        classId={classId}
        sectionId={sectionId}
        onClassChange={setClassId}
        onSectionChange={setSectionId}
        loadingSections={loadingSections}
      />
      {(type === 'collection' || type === 'daily') && (
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Payment Modes</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="online">Online</option>
          <option value="cheque">Cheque</option>
          <option value="card">Card</option>
        </select>
      )}
    </div>
  );

  const reportDescription =
    type === 'collection'
      ? 'Collection summary by payment'
      : type === 'outstanding'
        ? 'Outstanding fees by student'
        : type === 'defaulters'
          ? 'Students with overdue balances'
          : type === 'daily'
            ? "Today's collection by payment mode"
            : 'Generate printable student statements';

  return (
    <div className="space-y-4">
      <FeesPageHeader title="Financial Reports" description={reportDescription} />

      {FilterBar}

      {type === 'collection' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <VirtualizedTable
            rows={filteredPayments}
            getRowKey={(p) => String(p.id)}
            columns={[
              { key: 'student', header: 'Student', width: '2fr', render: (p) => (
                <span>{String(p.first_name)} {String(p.last_name)}</span>
              )},
              { key: 'class', header: 'Class', width: '1fr', render: (p) => {
                const student = studentById.get(Number(p.student_id));
                return <span>{student?.class_name || '—'}</span>;
              }},
              { key: 'section', header: 'Section', width: '1fr', render: (p) => {
                const student = studentById.get(Number(p.student_id));
                return <span>{student?.section_name || '—'}</span>;
              }},
              { key: 'date', header: 'Date', width: '1fr', render: (p) => (
                <span>{p.payment_date ? new Date(String(p.payment_date)).toLocaleDateString() : '—'}</span>
              )},
              { key: 'mode', header: 'Mode', width: '1fr', render: (p) => (
                <span className="capitalize">{String(p.payment_method)}</span>
              )},
              { key: 'amount', header: 'Amount', width: '1fr', headerClassName: 'text-right', cellClassName: 'text-right font-medium text-green-700', render: (p) => (
                <span>{formatFeeCurrency(p.amount_paid as number)}</span>
              )},
            ]}
            emptyMessage="No collection records"
          />
        </div>
      )}

      {(type === 'outstanding' || type === 'defaulters') && (
        <>
          {type === 'outstanding' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <StatBox label="Total Pending" value={formatFeeCurrency(stats?.total_pending)} />
              <StatBox label="Overdue" value={formatFeeCurrency(stats?.total_overdue)} />
              <StatBox label="Pending Students" value={String(stats?.pending_students_count || 0)} />
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <VirtualizedTable
            rows={defaulters}
            getRowKey={(s) => s.id}
            columns={[
              { key: 'name', header: 'Student', width: '2fr', render: (s) => (
                <Link href={`/fees/ledger/${s.id}`} className="text-primary-600 hover:underline">
                  {s.first_name} {s.last_name}
                </Link>
              )},
              { key: 'class', header: 'Class', width: '1fr', render: (s) => <span>{s.class_name || '—'}</span> },
              { key: 'section', header: 'Section', width: '1fr', render: (s) => <span>{s.section_name || '—'}</span> },
              { key: 'pending', header: 'Pending', width: '1fr', headerClassName: 'text-right', cellClassName: 'text-right text-red-700 font-medium', render: (s) => (
                <span>{formatFeeCurrency(s.pendingAmount)}</span>
              )},
              { key: 'status', header: 'Status', width: '1fr', render: (s) => (
                <span className="capitalize text-sm">{s.paymentStatus?.replace('_', ' ')}</span>
              )},
            ]}
            emptyMessage={studentsLoading ? 'Loading...' : 'No outstanding students'}
          />
          </div>
        </>
      )}

      {type === 'daily' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['cash', 'upi', 'online', 'cheque', 'card'].map((mode) => (
            <div key={mode} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase">{mode}</p>
              <p className="text-xl font-bold mt-1">{formatFeeCurrency(dailyBreakdown[mode] || 0)}</p>
            </div>
          ))}
          <div className="bg-primary-50 rounded-xl border border-primary-100 p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-primary-700 uppercase">Total Today</p>
            <p className="text-xl font-bold mt-1 text-primary-900">
              {formatFeeCurrency(Object.values(dailyBreakdown).reduce((a, b) => a + b, 0))}
            </p>
          </div>
        </div>
      )}

      {type === 'statements' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-4">
            Open a student ledger to view and print their full fee statement for parents.
          </p>
          <Link
            href="/fees/ledger"
            className="inline-flex px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            Browse Student Ledgers
          </Link>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold mt-1">{value || '—'}</p>
    </div>
  );
}

export default function FeesReportsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-500">Loading reports...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
