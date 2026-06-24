'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TransportStudentAssignmentsView from '@/features/transport/components/TransportStudentAssignmentsView';

export default function TransportRouteAssignmentsPage() {
  return (
    <DashboardLayout>
      <TransportStudentAssignmentsView />
    </DashboardLayout>
  );
}
