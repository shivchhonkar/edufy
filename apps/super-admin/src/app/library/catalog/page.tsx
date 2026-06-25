'use client';

import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';

export default function CatalogPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Catalog</h1>
          <p className="text-gray-500 text-sm mt-1">Books, copies and OPAC search</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/library/catalog/books" className="block p-4 bg-white border rounded-lg">Books</Link>
          <Link href="/library/catalog/copies" className="block p-4 bg-white border rounded-lg">Book Copies</Link>
          <Link href="/library/catalog/add" className="block p-4 bg-white border rounded-lg">Add Book</Link>
          <Link href="/library/catalog/opac" className="block p-4 bg-white border rounded-lg">OPAC Search</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
