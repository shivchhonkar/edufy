'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';

export default function DigitalLibraryPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Digital Library</h1>
        <p className="text-gray-500">E-Books and digital resources.</p>
      </div>
    </DashboardLayout>
  );
}
