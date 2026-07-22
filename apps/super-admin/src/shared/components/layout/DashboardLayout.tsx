'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { isClientAuthenticated } from '@/lib/client-auth';
import { usePortalSidebar, PortalSidebarBackdrop } from '@edulakhya/ui';
import { AdmissionNumberFormatProvider } from '@/shared/context/AdmissionNumberFormatContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { mobileOpen, openMobile, closeMobile } = usePortalSidebar();

  useEffect(() => {
    if (!isClientAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex h-[100dvh] flex-col theme-workspace overflow-hidden">
      <Header onMenuClick={openMobile} />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <PortalSidebarBackdrop open={mobileOpen} onClose={closeMobile} />
        <Sidebar mobileOpen={mobileOpen} onMobileClose={closeMobile} />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <AdmissionNumberFormatProvider>{children}</AdmissionNumberFormatProvider>
        </main>
      </div>
    </div>
  );
}
