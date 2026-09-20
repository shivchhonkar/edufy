'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import LibraryIssueForm from '@/features/library/components/LibraryIssueForm';

export default function StaffBookIssuePage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Staff Book Issue</h1>
          <p className="mt-1 text-sm text-gray-500">Issue a catalog copy to a staff member.</p>
        </div>
        <LibraryModuleLinks />
        <LibraryIssueForm borrowerType="staff" />
      </div>
    </DashboardLayout>
  );
}
