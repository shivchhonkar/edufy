'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import LibraryReturnForm from '@/features/library/components/LibraryReturnForm';

export default function StaffBookReturnPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Staff Book Return</h1>
          <p className="mt-1 text-sm text-gray-500">Return a copy issued to staff and apply Fine Master charges.</p>
        </div>
        <LibraryModuleLinks />
        <LibraryReturnForm borrowerType="staff" />
      </div>
    </DashboardLayout>
  );
}
