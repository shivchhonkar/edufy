'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/shared/SettingsContext';
import { useFeesStudents } from '@/features/fees/hooks/useFeesStudents';
import StudentSearchCard from '@/features/fees/components/StudentSearchCard';
import StudentCollectSummary from '@/features/fees/components/StudentCollectSummary';
import RecordPaymentModal from '@/features/fees/components/RecordPaymentModal';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';
import type { FeeStudentRow } from '@/features/fees/components/VirtualizedFeesStudentsTable';

export default function CollectFeePage() {
  const { settings } = useSettings();
  const { students, loading, refresh } = useFeesStudents(settings.academic_year);
  const [selectedStudent, setSelectedStudent] = useState<FeeStudentRow | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);

  useEffect(() => {
    if (!selectedStudent) return;
    const updated = students.find((s) => s.id === selectedStudent.id);
    if (
      updated &&
      (updated.pendingAmount !== selectedStudent.pendingAmount ||
        updated.paymentStatus !== selectedStudent.paymentStatus)
    ) {
      setSelectedStudent(updated);
    }
  }, [students, selectedStudent]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) {
        if (selectedStudent) setShowPayment(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedStudent]);

  return (
    <div className="space-y-6 mx-auto">
      <FeesPageHeader
        title="Collect Fee"
        description="Search for a student, review dues, and record payment in a few steps."
      />

      <StudentSearchCard
        students={students}
        loading={loading}
        selectedStudent={selectedStudent}
        onSelect={setSelectedStudent}
      />

      {selectedStudent ? (
        <StudentCollectSummary
          student={selectedStudent}
          refreshKey={summaryRefreshKey}
          onCollect={() => setShowPayment(true)}
        />
      ) : (
        <div className="text-center py-16 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
          Select a student to view outstanding fees and collect payment
        </div>
      )}

      <RecordPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={async () => {
          await refresh();
          setSummaryRefreshKey((k) => k + 1);
          setShowPayment(false);
        }}
        selectedStudent={selectedStudent}
      />
    </div>
  );
}
