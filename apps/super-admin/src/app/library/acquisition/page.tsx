'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';

export default function AcquisitionPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Acquisition</h1>
        <p className="text-gray-500">Book requests, purchase orders and received books.</p>
      </div>
    </DashboardLayout>
  );
}
