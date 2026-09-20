'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import LibraryIssueForm from '@/features/library/components/LibraryIssueForm';

export default function IssuePage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Issue Book</h1>
          <p className="mt-1 text-sm text-gray-500">Student circulation. Staff issue is under Staff Issue/Return.</p>
        </div>
        <LibraryModuleLinks />
        <LibraryIssueForm borrowerType="student" />
      </div>
    </DashboardLayout>
  );
}
