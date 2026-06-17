'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiCreditCard, FiSearch } from 'react-icons/fi';
import { useSettings } from '@/shared/SettingsContext';
import { useFeesStudents } from '@/features/fees/hooks/useFeesStudents';
import { useClassSectionOptions } from '@/features/fees/hooks/useClassSectionOptions';
import VirtualizedFeesStudentsTable from '@/features/fees/components/VirtualizedFeesStudentsTable';
import FeesClassSectionFilters from '@/features/fees/components/FeesClassSectionFilters';
import { formatFeeCurrency } from '@/features/fees/utils/fees-format';
import { filterFeeStudents } from '@/features/fees/utils/student-filters';
import RecordPaymentModal from '@/features/fees/components/RecordPaymentModal';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import type { FeeStudentRow } from '@/features/fees/components/VirtualizedFeesStudentsTable';

export default function StudentLedgerListPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const { students, loading, refresh } = useFeesStudents(settings.academic_year);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filtered = useMemo(
    () => filterFeeStudents(students, { search: searchTerm, classId, sectionId }),
    [students, searchTerm, classId, sectionId],
  );

  const handleView = useCallback(
    (student: FeeStudentRow) => router.push(`/fees/ledger/${student.id}`),
    [router],
  );

  const handlePay = useCallback((student: FeeStudentRow) => {
    setPaymentStudent(student);
    setShowPayment(true);
  }, []);

  return (
    <div className="space-y-4">
      <FeesPageHeader
        title="Student Ledger"
        description="Browse all students, view fee history, and open individual ledgers."
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, admission no., class, section..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <FeesClassSectionFilters
            classes={classes}
            sections={sections}
            classId={classId}
            sectionId={sectionId}
            onClassChange={setClassId}
            onSectionChange={setSectionId}
            loadingSections={loadingSections}
          />
          <Link
            href="/fees/collect"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <FiCreditCard size={16} />
            Quick Collect
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500 text-sm">Loading students...</div>
        ) : (
          <VirtualizedFeesStudentsTable
            students={filtered}
            formatCurrency={formatFeeCurrency}
            onViewFees={handleView}
            onRecordPayment={handlePay}
            hasActiveFilters={Boolean(searchTerm || hasActiveFilters)}
          />
        )}
      </div>

      <RecordPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={() => {
          refresh();
          setShowPayment(false);
        }}
        selectedStudent={paymentStudent}
      />
    </div>
  );
}
