'use client';

import StudentLedgerView from '@/features/fees/components/StudentLedgerView';

export default function StudentFeeDetailPage({
  params,
}: {
  params: { studentId: string };
}) {
  return (
    <div className="p-6">
      <StudentLedgerView studentId={params.studentId} />
    </div>
  );
}
