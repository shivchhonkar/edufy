'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import HrDashboardView from '@/features/hr/components/HrDashboardView';

export default function HrDashboardPage() {
  return (
    <DashboardLayout>
      <HrDashboardView />
    </DashboardLayout>
  );
}
