'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import LibraryReturnForm from '@/features/library/components/LibraryReturnForm';

export default function ReturnPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Return Book</h1>
          <p className="mt-1 text-sm text-gray-500">Student circulation. Staff return is under Staff Issue/Return.</p>
        </div>
        <LibraryModuleLinks />
        <LibraryReturnForm borrowerType="student" />
      </div>
    </DashboardLayout>
  );
}
