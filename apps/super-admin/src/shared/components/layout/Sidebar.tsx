'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, type ComponentType } from 'react';
import AppLogo from '@/shared/components/common/AppLogo';
import CollapsedNavGroupFlyout from '@/shared/components/layout/CollapsedNavGroupFlyout';
import { SIDEBAR_COLLAPSED_CLASS, SIDEBAR_EXPANDED_CLASS } from '@/shared/constants/sidebar';
import { useSettings } from '@/shared/SettingsContext';
import {
  SIDEBAR_NAV_GROUPS,
  getInitialExpandedGroups,
  getNavGroupDirectLink,
  isNavLinkActive,
} from '@/shared/navigation/sidebar-navigation';
import { FiMenu, FiChevronsLeft, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import type { PortalSidebarProps } from '@edulakhya/ui';

interface SidebarProps extends PortalSidebarProps {
  onToggle?: (collapsed: boolean) => void;
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

export default function Sidebar({ onToggle, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { settings } = useSettings();
  const schoolLogo = settings.logo_url;
  const schoolName = settings.school_name?.trim() || 'School CRM';

  const initialCollapsedState = useMemo(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState === null) {
        localStorage.setItem('sidebarCollapsed', 'false');
        return false;
      }
      return savedState === 'true';
    }
    return false;
  }, []);

  const [isCollapsed, setIsCollapsed] = useState(initialCollapsedState);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    getInitialExpandedGroups(pathname),
  );

  useEffect(() => {
    const activeGroup = SIDEBAR_NAV_GROUPS.find((group) =>
      group.items.some((item) => isNavLinkActive(pathname, item.path)),
    );
    if (activeGroup) {
      setExpandedGroups((prev) => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [pathname]);

  useEffect(() => {
    onToggle?.(isCollapsed);
    window.dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: isCollapsed }));
  }, [isCollapsed, onToggle]);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      window.dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: newState }));
      onToggle?.(newState);
      return newState;
    });
  }, [onToggle]);

  useEffect(() => {
    window.addEventListener('sidebar-toggle-request', toggleSidebar);
    return () => window.removeEventListener('sidebar-toggle-request', toggleSidebar);
  }, [toggleSidebar]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isGroupActive = (groupId: string) => {
    const group = SIDEBAR_NAV_GROUPS.find((g) => g.id === groupId);
    return group?.items.some((item) => isNavLinkActive(pathname, item.path)) ?? false;
  };

  const displayCollapsed = isCollapsed && !mobileOpen;

  const linkActiveClass =
    'bg-primary-50 text-primary-700 border-r-2 border-primary-600 font-medium';
  const linkIdleClass = 'text-gray-700 hover:bg-gray-50 hover:text-gray-900';

  return (
    <div
      className={`sidebar-container flex-shrink-0 h-full overflow-y-auto transition-transform duration-300 z-50 text-xs shadow-sm fixed inset-y-0 left-0 lg:relative ${
        displayCollapsed ? SIDEBAR_COLLAPSED_CLASS : SIDEBAR_EXPANDED_CLASS
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      <div className={`border-b border-gray-200 ${displayCollapsed ? 'px-2 py-2.5' : 'px-3 py-2.5'}`}>
        {displayCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/40"
              title={schoolName}
            >
              <AppLogo variant="sidebar-collapsed" src={schoolLogo} alt={schoolName} />
            </Link>
            <button
              onClick={toggleSidebar}
              className="hidden lg:block rounded-md p-1 hover:bg-gray-100 transition-colors"
              title="Expand Menu"
            >
              <FiMenu size={16} className="text-primary-600" />
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center justify-between gap-1.5">
            <Link
              href="/dashboard"
              className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg p-1 -m-1 transition-colors hover:bg-white/80"
              title={schoolName}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                <AppLogo variant="sidebar" src={schoolLogo} alt={schoolName} />
              </div>
              <p className="truncate text-[11px] font-semibold leading-tight text-gray-900" title={schoolName}>
                {schoolName.length > 48 ? `${schoolName.slice(0, 48)}...` : schoolName}
              </p>
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden lg:flex shrink-0 rounded-md p-1 transition-colors hover:bg-gray-100"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <FiChevronsLeft size={16} className="text-primary-600" />
            </button>
          </div>
        )}
      </div>

      <nav className="px-1.5 py-2 pb-4">
        {SIDEBAR_NAV_GROUPS.map((group) => {
          const Icon = group.icon;
          const directLink = getNavGroupDirectLink(group);
          const expanded = expandedGroups[group.id];
          const active = isGroupActive(group.id);

          if (displayCollapsed) {
            if (directLink) {
              return (
                <Link
                  key={group.id}
                  href={directLink.path}
                  onClick={() => onMobileClose?.()}
                  className={`sidebar-nav-link flex items-center justify-center w-full rounded-md px-1 py-1.5 mb-0.5 transition-colors ${
                    active ? linkActiveClass : linkIdleClass
                  }`}
                  title={group.title}
                >
                  <NavIconBadge icon={Icon} active={active} compact />
                </Link>
              );
            }

            return (
              <CollapsedNavGroupFlyout
                key={group.id}
                group={group}
                active={active}
                pathname={pathname}
                onNavigate={() => onMobileClose?.()}
              />
            );
          }

          if (directLink) {
            return (
              <Link
                key={group.id}
                href={directLink.path}
                onClick={() => onMobileClose?.()}
                className={`sidebar-nav-link flex items-center gap-2 w-full rounded-md px-2 py-1.5 mb-0.5 transition-colors ${
                  active ? linkActiveClass : linkIdleClass
                }`}
              >
                <NavIconBadge icon={Icon} active={active} />
                <span className="min-w-0 flex-1 truncate text-left text-[12px] uppercase tracking-wide leading-none">
                  {group.title}
                </span>
                {directLink.comingSoon && (
                  <span className="shrink-0 text-[9px] uppercase tracking-wide text-amber-400 font-semibold">
                    Soon
                  </span>
                )}
              </Link>
            );
          }

          return (
            <div key={group.id} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`sidebar-nav-link flex items-center gap-2 w-full rounded-md px-2 py-1.5 transition-colors ${
                  active ? 'text-primary-700 font-medium' : linkIdleClass
                }`}
              >
                <NavIconBadge icon={Icon} active={active} />
                <span className="min-w-0 flex-1 truncate text-left text-[12px] uppercase tracking-wide leading-none">
                  {group.title}
                </span>
                {expanded ? (
                  <FiChevronDown className="sidebar-chevron h-3.5 w-3.5 shrink-0 opacity-60" />
                ) : (
                  <FiChevronRight className="sidebar-chevron h-3.5 w-3.5 shrink-0 opacity-60" />
                )}
              </button>

              {expanded && (
                <div className="mt-0.5 space-y-0.5 pb-1">
                  {group.items.map((item) => {
                    const itemActive = isNavLinkActive(pathname, item.path);
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={`${group.id}-${item.path}`}
                        href={item.path}
                        onClick={() => onMobileClose?.()}
                        className={`flex items-center gap-2 rounded-md pl-7 pr-2 py-1 transition-colors ${
                          itemActive ? linkActiveClass : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <ItemIcon
                          className={`sidebar-nav-icon h-3.5 w-3.5 shrink-0 ${
                            itemActive ? 'sidebar-nav-icon-active' : 'sidebar-nav-icon-muted'
                          }`}
                        />
                        <span className="min-w-0 flex-1 truncate text-[12px] leading-tight">{item.name}</span>
                        {item.comingSoon && (
                          <span className="shrink-0 text-[9px] uppercase tracking-wide text-amber-400 font-semibold">
                            Soon
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
