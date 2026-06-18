'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { isClientAuthenticated } from '@/lib/client-auth';
import { usePortalSidebar, PortalSidebarBackdrop } from '@edulakhya/ui';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { mobileOpen, openMobile, closeMobile } = usePortalSidebar();

  useEffect(() => {
    if (!isClientAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex h-[100dvh] theme-workspace overflow-hidden">
      <PortalSidebarBackdrop open={mobileOpen} onClose={closeMobile} />
      <Sidebar mobileOpen={mobileOpen} onMobileClose={closeMobile} />
      <div className="flex min-w-0 flex-1 flex-col min-h-0 transition-all duration-300">
        <Header onMenuClick={openMobile} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-h-0 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
