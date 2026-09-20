'use client';

import { useRouter } from 'next/navigation';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import LibraryModuleLinks from '@/features/library/components/LibraryModuleLinks';
import LibraryIssueForm from '@/features/library/components/LibraryIssueForm';

export default function StudentBookIssuePage() {
  const router = useRouter();

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Student Book Issue</h1>
          <p className="mt-1 text-sm text-gray-500">Issue a catalog copy to a student.</p>
        </div>
        <LibraryModuleLinks />
        <LibraryIssueForm
          borrowerType="student"
          onIssued={() => router.push('/library/reports/issued')}
        />
      </div>
    </DashboardLayout>
  );
}
