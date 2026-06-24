'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TransportDriverManagementView from '@/features/transport/components/TransportDriverManagementView';

export default function TransportDriverManagementPage() {
  return (
    <DashboardLayout>
      <TransportDriverManagementView />
    </DashboardLayout>
  );
}
