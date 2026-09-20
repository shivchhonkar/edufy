'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import DashboardScreen from '@/features/dashboard/components/DashboardScreen';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardScreen />
    </DashboardLayout>
  );
}
