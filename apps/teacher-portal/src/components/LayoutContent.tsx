'use client'

import Sidebar from './Sidebar'
import { usePathname } from 'next/navigation'
import { SchoolBrandingProvider } from '@/contexts/SchoolBrandingContext'
import { usePortalSidebar, PortalSidebarBackdrop, PortalMobileTopBar } from '@edulakhya/ui'
import { TEACHER_PORTAL_LABEL } from '@/lib/site-seo'

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { setSidebarCollapsed, mobileOpen, openMobile, closeMobile, mainOffsetClass } =
    usePortalSidebar()

  if (pathname === '/login') {
    return <SchoolBrandingProvider>{children}</SchoolBrandingProvider>
  }

  return (
    <SchoolBrandingProvider>
      <div className="flex h-[100dvh] overflow-hidden portal-workspace">
        <PortalSidebarBackdrop open={mobileOpen} onClose={closeMobile} />
        <Sidebar onToggle={setSidebarCollapsed} mobileOpen={mobileOpen} onMobileClose={closeMobile} />
        <div
          className={`flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 ${mainOffsetClass}`}
        >
          <PortalMobileTopBar title={TEACHER_PORTAL_LABEL} onMenuClick={openMobile} />
          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SchoolBrandingProvider>
  )
}
