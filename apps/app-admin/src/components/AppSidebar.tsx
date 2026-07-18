'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FiChevronsLeft, FiLogOut, FiMenu } from 'react-icons/fi';
import { getUser, logout } from '@/lib/auth';
import { APP_ADMIN_NAV } from '@/lib/nav-config';
import { getPortalSidebarDrawerClasses, type PortalSidebarProps } from '@edulakhya/ui';

export default function AppSidebar({
  onToggle,
  mobileOpen = false,
  onMobileClose,
}: PortalSidebarProps & { onToggle?: (collapsed: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const displayName = String(user?.full_name || user?.email || 'Super Admin');

  const initialCollapsedState = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('appAdminSidebarCollapsed') === 'true';
    }
    return false;
  }, []);

  const [isCollapsed, setIsCollapsed] = useState(initialCollapsedState);

  useEffect(() => {
    onToggle?.(isCollapsed);
  }, [isCollapsed, onToggle]);

  if (pathname === '/login') return null;

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('appAdminSidebarCollapsed', String(next));
    onToggle?.(next);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const displayCollapsed = isCollapsed && !mobileOpen;

  const isActive = (path: string) =>
    pathname === path || (path !== '/' && pathname.startsWith(path));

  return (
    <aside
      className={getPortalSidebarDrawerClasses(
        mobileOpen,
        isCollapsed,
        'app-admin-sidebar flex flex-col text-white',
      )}
      aria-label="App admin navigation"
    >
      <div className={displayCollapsed ? 'p-4' : 'px-5 py-5'}>
        {displayCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div className="app-admin-brand-mark" title="Shribi Edufy">
              SE
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="app-admin-sidebar-icon-btn hidden lg:inline-flex"
              title="Expand menu"
            >
              <FiMenu size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="app-admin-brand-mark shrink-0">SE</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-wide text-white">SHRIBI EDUFY</p>
                <p className="text-xs text-blue-100/80">Super Admin</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="app-admin-sidebar-icon-btn mt-0.5 hidden shrink-0 lg:inline-flex"
              title="Collapse menu"
            >
              <FiChevronsLeft size={18} />
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {APP_ADMIN_NAV.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={`${item.name}-${item.path}`}
              href={item.path}
              onClick={onMobileClose}
              className={`app-admin-nav-link ${active ? 'app-admin-nav-link-active' : ''} ${
                displayCollapsed ? 'justify-center px-2' : ''
              }`}
              title={displayCollapsed ? item.name : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!displayCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 px-3 pb-5">
        {!displayCollapsed && (
          <div className="app-admin-promo-card">
            <p className="text-sm font-semibold text-white">Grow More Schools</p>
            <p className="mt-1 text-xs text-purple-100/90">
              Invite new organizations and expand your platform reach.
            </p>
            <Link href="/organizations" className="app-admin-promo-btn">
              Invite Now
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className={`app-admin-signout-btn ${displayCollapsed ? 'justify-center px-2' : ''}`}
          title={displayCollapsed ? 'Sign out' : undefined}
        >
          <FiLogOut size={18} className="shrink-0" />
          {!displayCollapsed && <span>Sign out</span>}
        </button>
        {!displayCollapsed && (
          <p className="truncate px-1 text-center text-[11px] text-blue-100/60">{displayName}</p>
        )}
      </div>
    </aside>
  );
}
