'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import TransportVehiclesView from '@/features/transport/components/TransportVehiclesView';

export default function TransportVehiclesPage() {
  return (
    <DashboardLayout>
      <TransportVehiclesView />
    </DashboardLayout>
  );
}
