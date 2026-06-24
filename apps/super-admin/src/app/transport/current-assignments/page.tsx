'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TransportCurrentAssignmentsView from '@/features/transport/components/TransportCurrentAssignmentsView';

export default function TransportCurrentAssignmentsPage() {
  return (
    <DashboardLayout>
      <TransportCurrentAssignmentsView />
    </DashboardLayout>
  );
}
