'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';

export default function LibrarySettingsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Library Settings</h1>
        <p className="text-gray-500">Configure library settings and defaults.</p>
      </div>
    </DashboardLayout>
  );
}
