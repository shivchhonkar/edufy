'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TransportDashboardView from '@/features/transport/components/TransportDashboardView';

export default function TransportDashboardPage() {
  return (
    <DashboardLayout>
      <TransportDashboardView />
    </DashboardLayout>
  );
}
