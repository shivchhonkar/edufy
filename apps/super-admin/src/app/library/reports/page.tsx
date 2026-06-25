'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Library Reports</h1>
        <p className="text-gray-500">Reports generation and export.</p>
      </div>
    </DashboardLayout>
  );
}
