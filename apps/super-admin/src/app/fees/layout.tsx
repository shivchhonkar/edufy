'use client';

import { Suspense } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import FeesFinanceNav from '@/features/fees/components/FeesFinanceNav';

export default function FeesLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto">
        {/* <Suspense fallback={<div className="h-12 mb-6 bg-gray-100 rounded-xl animate-pulse" />}>
          <FeesFinanceNav />
        </Suspense> */}
        {children}
      </div>
    </DashboardLayout>
  );
}
