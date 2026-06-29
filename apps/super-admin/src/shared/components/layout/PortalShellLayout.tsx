'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { useSettings } from '@/shared/SettingsContext';
import SidebarBrandHeader from '@/shared/components/layout/SidebarBrandHeader';
import PortalShellHeader from '@/shared/components/layout/PortalShellHeader';
import { PORTAL_NAV, type PortalNavItem } from '@/shared/navigation/portal-navigation';
import type { PortalId } from '@/lib/role-routing';
import { clearClientSession, isClientAuthenticated } from '@/lib/client-auth';
import { SIDEBAR_COLLAPSED_CLASS, SIDEBAR_EXPANDED_CLASS } from '@/shared/constants/sidebar';
import { FiLogOut } from 'react-icons/fi';
import { PortalSidebarBackdrop, usePortalSidebar } from '@edulakhya/ui';

interface PortalShellLayoutProps {
  portalId: PortalId;
  children: React.ReactNode;
}

function NavIconBadge({
  icon: Icon,
  active = false,
  compact = false,
}: {
  icon: ComponentType<{ className?: string }>;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={`sidebar-icon-badge flex shrink-0 items-center justify-center rounded-md ${
        compact ? 'h-7 w-7' : 'h-6 w-6'
      } ${active ? 'sidebar-icon-badge-active' : 'sidebar-icon-badge-default'}`}
    >
      <Icon className={`sidebar-nav-icon ${compact ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
    </span>
  );
}

function isNavActive(pathname: string, path: string): boolean {
  if (path === '/teacher' || path === '/parent' || path === '/admin') {
    return pathname === path;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function PortalShellLayout({ portalId, children }: PortalShellLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings();
  const { mobileOpen, openMobile, closeMobile } = usePortalSidebar();
  const storageKey = `portalSidebarCollapsed:${portalId}`;

  const initialCollapsedState = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) === 'true';
    }
    return false;
  }, [storageKey]);

  const [isCollapsed, setIsCollapsed] = useState(initialCollapsedState);

  const navItems = PORTAL_NAV[portalId];
  const portalHomeHref = navItems[0]?.path ?? '/';
  const schoolName = settings.school_name?.trim() || 'School';
  const schoolLogo = settings.logo_url?.trim() || '';
  const displayCollapsed = isCollapsed && !mobileOpen;

  const linkActiveClass =
    'bg-primary-50 text-primary-700 border-r-2 border-primary-600 font-medium';
  const linkIdleClass = 'text-gray-700 hover:bg-gray-50 hover:text-gray-900';

  useEffect(() => {
    if (!isClientAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  }, [storageKey]);

  useEffect(() => {
    const handleToggleRequest = () => toggleSidebar();
    window.addEventListener('sidebar-toggle-request', handleToggleRequest);
    return () => window.removeEventListener('sidebar-toggle-request', handleToggleRequest);
  }, [toggleSidebar]);

  const handleLogout = () => {
    clearClientSession();
    router.push('/login');
  };

  const renderNavLink = (item: PortalNavItem) => {
    const active = isNavActive(pathname, item.path);
    const Icon = item.icon;

    if (displayCollapsed) {
      return (
        <Link
          key={item.path}
          href={item.comingSoon ? '#' : item.path}
          onClick={(e) => {
            if (item.comingSoon) e.preventDefault();
            closeMobile();
          }}
          title={item.name}
          className={`sidebar-nav-link flex items-center justify-center w-full rounded-md px-1 py-1.5 mb-0.5 transition-colors ${
            active ? linkActiveClass : linkIdleClass
          }`}
        >
          <NavIconBadge icon={Icon} active={active} compact />
        </Link>
      );
    }

    return (
      <Link
        key={item.path}
        href={item.comingSoon ? '#' : item.path}
        onClick={(e) => {
          if (item.comingSoon) e.preventDefault();
          closeMobile();
        }}
        className={`sidebar-nav-link flex items-center gap-2 w-full rounded-md px-2 py-1.5 mb-0.5 transition-colors ${
          active ? linkActiveClass : linkIdleClass
        }`}
      >
        <NavIconBadge icon={Icon} active={active} />
        <span className="truncate text-[13px]">
          {item.name}
          {item.comingSoon && <span className="ml-1 text-[10px] opacity-60">Soon</span>}
        </span>
      </Link>
    );
  };

  return (
    <div className="flex h-[100dvh] theme-workspace overflow-hidden">
      <PortalSidebarBackdrop open={mobileOpen} onClose={closeMobile} />

      <aside
        className={`sidebar-container flex-shrink-0 h-full overflow-y-auto overflow-x-hidden transition-transform duration-300 z-50 text-xs shadow-sm fixed inset-y-0 left-0 lg:relative ${
          displayCollapsed ? SIDEBAR_COLLAPSED_CLASS : SIDEBAR_EXPANDED_CLASS
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <SidebarBrandHeader
          schoolName={schoolName}
          schoolLogo={schoolLogo}
          homeHref={portalHomeHref}
          collapsed={displayCollapsed}
          onToggle={toggleSidebar}
        />

        <nav className={`flex-1 overflow-y-auto ${displayCollapsed ? 'px-1.5 py-2' : 'px-2 py-2'}`}>
          {navItems.map(renderNavLink)}
        </nav>

        <div className={`border-t border-gray-200 ${displayCollapsed ? 'px-1.5 py-2' : 'px-2 py-2'}`}>
          {displayCollapsed ? (
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className={`sidebar-nav-link flex items-center justify-center w-full rounded-md px-1 py-1.5 transition-colors ${linkIdleClass}`}
            >
              <NavIconBadge icon={FiLogOut} compact />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className={`sidebar-nav-link flex items-center gap-2 w-full rounded-md px-2 py-1.5 transition-colors ${linkIdleClass}`}
            >
              <NavIconBadge icon={FiLogOut} />
              <span className="text-[13px]">Sign out</span>
            </button>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col min-h-0">
        <PortalShellHeader portalId={portalId} onMenuClick={openMobile} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-h-0">{children}</main>
      </div>
    </div>
  );
}
