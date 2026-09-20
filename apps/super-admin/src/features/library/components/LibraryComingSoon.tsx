'use client';

import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { FiClock } from 'react-icons/fi';
import LibraryModuleLinks from './LibraryModuleLinks';

export default function LibraryComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-4">
        <LibraryModuleLinks />
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <FiClock size={28} />
          </div>
          <h1 className="mt-4 text-lg font-medium text-gray-900">{title}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            {description || 'This screen is planned and will be available in a future release.'}
          </p>
          <Link
            href="/library"
            className="mt-6 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Back to Library Dashboard
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
