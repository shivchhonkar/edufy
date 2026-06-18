'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { isClientAuthenticated } from '@/lib/client-auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isClientAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex h-screen theme-workspace overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 min-w-0 transition-all duration-300">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
