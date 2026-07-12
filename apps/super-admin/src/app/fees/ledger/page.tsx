'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiChevronDown,
  FiChevronUp,
  FiCreditCard,
  FiDownload,
  FiFilter,
  FiPieChart,
  FiSearch,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';
import { useSettings } from '@/shared/SettingsContext';
import { useFeesStudents } from '@/features/fees/hooks/useFeesStudents';
import { useClassSectionOptions } from '@/features/fees/hooks/useClassSectionOptions';
import VirtualizedFeesStudentsTable from '@/features/fees/components/VirtualizedFeesStudentsTable';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import { filterFeeStudents } from '@/features/fees/utils/student-filters';
import {
  buildLedgerFilterSubtext,
  computeLedgerSummaryStats,
  type MonthPaymentRow,
} from '@/features/fees/utils/ledger-summary-stats';
import RecordPaymentModal from '@/features/fees/components/RecordPaymentModal';
import type { FeeStudentRow } from '@/features/fees/components/VirtualizedFeesStudentsTable';

const FILTER_SELECT =
  'px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 min-w-[130px]';

export default function StudentLedgerListPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const { students, loading, refresh } = useFeesStudents(settings.academic_year);
  const [monthPayments, setMonthPayments] = useState<MonthPaymentRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [feeStatusFilter, setFeeStatusFilter] = useState('');
  const {
    classes,
    sections,
    classId,
    sectionId,
    setClassId,
    setSectionId,
    loadingSections,
    hasActiveFilters,
  } = useClassSectionOptions();
  const [paymentStudent, setPaymentStudent] = useState<FeeStudentRow | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const filtered = useMemo(
    () =>
      filterFeeStudents(students, {
        search: searchTerm,
        classId,
        sectionId,
        feeStatus: feeStatusFilter || undefined,
      }),
    [students, searchTerm, classId, sectionId, feeStatusFilter],
  );

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    fetch(`/api/fees?status=completed&start_date=${start}&end_date=${end}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setMonthPayments(data.data);
        else setMonthPayments([]);
      })
      .catch(() => setMonthPayments([]));
  }, [settings.academic_year]);

  const summaryStats = useMemo(
    () => computeLedgerSummaryStats(filtered, monthPayments),
    [filtered, monthPayments],
  );

  const hasAnyFilter = Boolean(searchTerm || hasActiveFilters || feeStatusFilter);
  const activeFilterCount = [searchTerm, classId, sectionId, feeStatusFilter].filter(Boolean).length;

  const feeStatusLabel =
    {
      pending: 'Pending',
      overdue: 'Overdue',
      due_soon: 'Due Soon',
      completed: 'Paid',
      not_assigned: 'Unassigned Fees',
    }[feeStatusFilter] || feeStatusFilter;

  const studentsSubtext = buildLedgerFilterSubtext({
    hasActiveFilters: hasAnyFilter,
    searchTerm,
    classId,
    sectionId,
    feeStatusFilter,
    className: classes.find((c) => String(c.id) === classId)?.name,
    sectionName: sections.find((s) => String(s.id) === sectionId)?.name,
    totalStudents: summaryStats.totalStudents,
  });

  const outstandingSubtext = hasAnyFilter
    ? `From ${summaryStats.totalStudents} filtered student${summaryStats.totalStudents === 1 ? '' : 's'}`
    : 'Across all students';

  const collectedSubtext = hasAnyFilter
    ? `From ${summaryStats.totalStudents} filtered student${summaryStats.totalStudents === 1 ? '' : 's'}`
    : 'Till now';

  const clearFilters = () => {
    setSearchTerm('');
    setClassId('');
    setSectionId('');
    setFeeStatusFilter('');
  };

  const handleView = useCallback(
    (student: FeeStudentRow) => router.push(`/fees/ledger/${student.id}`),
    [router],
  );

  const handlePay = useCallback((student: FeeStudentRow) => {
    setPaymentStudent(student);
    setShowPayment(true);
  }, []);

  const exportCsv = () => {
    const headers = [
      'Student',
      'Admission No',
      'Parent',
      'Contact',
      'Class',
      'Section',
      'Outstanding',
      'Status',
    ];
    const rows = filtered.map((s) => [
      `${s.first_name} ${s.last_name}`,
      s.admission_number,
      s.parent_name || '',
      s.parent_phone || '',
      s.class_name || '',
      s.section_name || '',
      s.paymentStatus === 'pending' ? String(s.pendingAmount || 0) : '0',
      s.paymentStatus || '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student-ledger.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl text-gray-900">Student Ledger</h1>
          {/* <p className="text-sm text-gray-500 mt-1">
            View all students, their outstanding fees and manage collections.
          </p> */}
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <button
              type="button"
              onClick={() => setFiltersExpanded((prev) => !prev)}
              aria-expanded={filtersExpanded}
              className={`border px-2.5 py-1.5 rounded-md flex items-center gap-1.5 text-xs transition-colors ${
                filtersExpanded || hasAnyFilter
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <FiFilter size={15} />
              <span>Filters</span>
              {hasAnyFilter && (
                <span className="text-xs bg-primary-600 text-white px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                  {activeFilterCount}
                </span>
              )}
              {filtersExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
            </button>
          <Link
            href="/fees/collect"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <FiCreditCard size={16} />
            Quick Collect
          </Link>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <FiDownload size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Students"
          value={String(summaryStats.totalStudents)}
          subtext={studentsSubtext}
          icon={<FiUsers size={18} />}
          iconBg="bg-blue-100 text-blue-600"
          cardBg="bg-blue-50/60 border-blue-100"
        />
        <SummaryCard
          label="Total Outstanding"
          value={formatFeeCurrency(summaryStats.totalOutstanding)}
          subtext={outstandingSubtext}
          icon={<RupeeIcon size={18} />}
          iconBg="bg-amber-100 text-amber-700"
          cardBg="bg-amber-50/60 border-amber-100"
        />
        <SummaryCard
          label="Collected This Month"
          value={formatFeeCurrency(summaryStats.collectedThisMonth)}
          subtext={collectedSubtext}
          icon={<FiCreditCard size={18} />}
          iconBg="bg-green-100 text-green-600"
          cardBg="bg-green-50/60 border-green-100"
        />
        <SummaryCard
          label="Collection Rate"
          value={`${summaryStats.collectionRate}%`}
          subtext={hasAnyFilter ? 'Filtered set' : 'This Month'}
          icon={<FiPieChart size={18} />}
          iconBg="bg-purple-100 text-purple-600"
          cardBg="bg-purple-50/60 border-purple-100"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 space-y-3">
          {/* <div
            className={`flex flex-wrap items-center gap-2 ${
              hasAnyFilter ? 'justify-between' : 'justify-end'
            }`}
          >
            {hasAnyFilter && (
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-800">{filtered.length}</span> of{' '}
                {students.length} students
              </p>
            )}
            
          </div> */}

          {filtersExpanded && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, admission no., class..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                  />
                </div>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className={FILTER_SELECT}
                  aria-label="Filter by class"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  disabled={!classId || loadingSections}
                  className={`${FILTER_SELECT} disabled:bg-gray-50 disabled:text-gray-400`}
                  aria-label="Filter by section"
                >
                  <option value="">All Sections</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={feeStatusFilter}
                  onChange={(e) => setFeeStatusFilter(e.target.value)}
                  className={FILTER_SELECT}
                  aria-label="Filter by status"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="due_soon">Due Soon</option>
                  <option value="completed">Paid</option>
                  <option value="not_assigned">Unassigned Fees</option>
                </select>
              </div>

              {hasAnyFilter && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {searchTerm && (
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
                        Search: &quot;{searchTerm}&quot;
                      </span>
                    )}
                    {classId && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                        Class: {classes.find((c) => String(c.id) === classId)?.name}
                      </span>
                    )}
                    {sectionId && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                        Section: {sections.find((s) => String(s.id) === sectionId)?.name}
                      </span>
                    )}
                    {feeStatusFilter && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs">
                        Status: {feeStatusLabel}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  >
                    <FiX size={14} />
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}

          {!filtersExpanded && hasAnyFilter && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">Filtered:</span>
              {searchTerm && (
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                  &quot;{searchTerm}&quot;
                </span>
              )}
              {classId && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  {classes.find((c) => String(c.id) === classId)?.name}
                </span>
              )}
              {sectionId && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                  {sections.find((s) => String(s.id) === sectionId)?.name}
                </span>
              )}
              {feeStatusFilter && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                  {feeStatusLabel}
                </span>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-800 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500 text-sm">Loading students...</div>
        ) : (
          <VirtualizedFeesStudentsTable
            students={filtered}
            formatCurrency={formatFeeCurrency}
            onViewFees={handleView}
            onRecordPayment={handlePay}
            hasActiveFilters={hasAnyFilter}
          />
        )}
      </div>

      <RecordPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={() => {
          refresh();
          setShowPayment(false);
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
          fetch(`/api/fees?status=completed&start_date=${start}&end_date=${end}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.success) setMonthPayments(data.data);
            })
            .catch(() => {});
        }}
        selectedStudent={paymentStudent}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subtext,
  icon,
  iconBg,
  cardBg,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  iconBg: string;
  cardBg: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${cardBg}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-600">{label}</p>
          <p className="text-xl text-gray-900 mt-0.5 truncate">{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>
        </div>
      </div>
    </div>
  );
}
