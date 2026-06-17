'use client';

import StudentLedgerView from '@/features/fees/components/StudentLedgerView';

export default function StudentLedgerDetailPage({
  params,
}: {
  params: { studentId: string };
}) {
  const { studentId } = params;
  const id = parseInt(studentId, 10);

  if (Number.isNaN(id)) {
    return <p className="text-gray-500">Invalid student ID</p>;
  }

  return <StudentLedgerView studentId={id} />;
}
