'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TransportRoutesView from '@/features/transport/components/TransportRoutesView';

export default function TransportRoutesPage() {
  return (
    <DashboardLayout>
      <TransportRoutesView />
    </DashboardLayout>
  );
}
