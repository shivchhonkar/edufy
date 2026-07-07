import TransportStudentDetailView from '@/features/transport/components/TransportStudentDetailView';

interface PageProps {
  params: { studentId: string };
}

export default function TransportStudentDetailPage({ params }: PageProps) {
  const studentId = parseInt(params.studentId, 10);
  if (!Number.isFinite(studentId) || studentId <= 0) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">Invalid student id.</div>
    );
  }

  return <TransportStudentDetailView studentId={studentId} />;
}
