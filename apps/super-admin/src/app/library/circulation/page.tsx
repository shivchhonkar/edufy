'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import Link from 'next/link';

export default function CirculationPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Circulation</h1>
          <p className="text-gray-500 text-sm mt-1">Issue, return, renewals and reservations</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/library/circulation/issue" className="block p-4 bg-white border rounded-lg">Issue Book</Link>
          <Link href="/library/circulation/return" className="block p-4 bg-white border rounded-lg">Return Book</Link>
          <Link href="/library/circulation/renew" className="block p-4 bg-white border rounded-lg">Renew Book</Link>
          <Link href="/library/circulation/reservations" className="block p-4 bg-white border rounded-lg">Reservations</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
