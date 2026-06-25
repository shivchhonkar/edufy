'use client';

import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';

export default function LibraryMastersPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Library Masters</h1>
          <p className="text-gray-500 text-sm mt-1">Manage categories, authors, publishers, vendors and locations</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/library/masters/categories" className="block p-4 bg-white border rounded-lg">Categories</Link>
          <Link href="/library/masters/authors" className="block p-4 bg-white border rounded-lg">Authors</Link>
          <Link href="/library/masters/publishers" className="block p-4 bg-white border rounded-lg">Publishers</Link>
          <Link href="/library/masters/vendors" className="block p-4 bg-white border rounded-lg">Vendors</Link>
          <Link href="/library/masters/locations" className="block p-4 bg-white border rounded-lg">Locations</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
