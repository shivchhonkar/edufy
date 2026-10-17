'use client';

import AcademicsDashboardView from '@/features/academics/components/AcademicsDashboardView';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';

export default function AcademicsDashboardPage() {
  return (
    <DashboardLayout>
      <AcademicsDashboardView />
    </DashboardLayout>
  );
}
