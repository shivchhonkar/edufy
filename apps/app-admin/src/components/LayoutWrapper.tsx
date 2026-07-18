'use client';

import AppSidebar from '@/components/AppSidebar';
import { usePathname } from 'next/navigation';
import { PortalSidebarBackdrop, PortalMobileTopBar } from '@edulakhya/ui';
import { useAppAdminSidebar } from '@/hooks/useAppAdminSidebar';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setSidebarCollapsed, mobileOpen, openMobile, closeMobile, mainOffsetClass, ready } =
    useAppAdminSidebar();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center portal-workspace">
        <div className="h-10 w-10 animate-spin rounded-full border-2 portal-spinner border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden portal-workspace">
      <PortalSidebarBackdrop open={mobileOpen} onClose={closeMobile} />
      <AppSidebar
        onToggle={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />
      <div
        className={`flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 ${mainOffsetClass}`}
      >
        <PortalMobileTopBar title="Shribi Edufy" onMenuClick={openMobile} />
        <main className="app-admin-main">{children}</main>
      </div>
    </div>
  );
}
