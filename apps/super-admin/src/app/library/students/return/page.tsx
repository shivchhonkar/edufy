'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import LibraryReturnForm from '@/features/library/components/LibraryReturnForm';

export default function StudentBookReturnPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Student Book Return</h1>
          <p className="mt-1 text-sm text-gray-500">
            Search by student or book name, then return the issued copy.
          </p>
        </div>
        <LibraryModuleLinks />
        <LibraryReturnForm borrowerType="student" />
      </div>
    </DashboardLayout>
  );
}
