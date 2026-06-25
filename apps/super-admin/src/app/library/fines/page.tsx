'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';

export default function FinesPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Fine Management</h1>
        <p className="text-gray-500">Fine rules, collection and outstanding fines will be managed here.</p>
      </div>
    </DashboardLayout>
  );
}
